import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/utils/auth'
import { ValidationError, handleError } from '@/lib/utils/errors'
import {
  SociaVaultService,
  type InstagramAnalytics,
  type TikTokAnalytics,
  type TwitterAnalytics,
} from '@/lib/social-media/sociavault'
import { calculateTier, type SocialMetrics } from '@/lib/utils/tier-calculator'

export async function POST(req: NextRequest) {
  try {
    const creator = await requireCreator()
    const body = await req.json()
    const { socialLinks } = body

    if (!socialLinks || (typeof socialLinks === 'object' && Object.keys(socialLinks).length === 0)) {
      return NextResponse.json(
        { error: 'At least one valid social media profile is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    // Validate at least one social link is provided
    if (!socialLinks.instagram && !socialLinks.tiktok && !socialLinks.twitter) {
      return NextResponse.json(
        { error: 'At least one social media profile is required' },
        { status: 400 }
      )
    }

    // Use SociaVault to verify creator profiles
    console.log('Verifying profiles with SociaVault:', {
      instagram: socialLinks.instagram ? 'provided' : 'missing',
      tiktok: socialLinks.tiktok ? 'provided' : 'missing',
      twitter: socialLinks.twitter ? 'provided' : 'missing',
      receivedData: {
        instagram: socialLinks.instagram,
        tiktok: socialLinks.tiktok,
        twitter: socialLinks.twitter,
      },
    })

    const verificationResult = await SociaVaultService.verifyCreator(socialLinks)

    console.log('Verification result:', {
      success: verificationResult.success,
      tier: verificationResult.tier,
      analyticsKeys: Object.keys(verificationResult.analytics),
      errors: verificationResult.errors,
      qualityScore: verificationResult.qualityScore,
    })

    // Allow partial success - if at least one platform succeeds, proceed
    if (!verificationResult.success || Object.keys(verificationResult.analytics).length === 0) {
      // Check if errors are profile-not-found vs API configuration issues
      const hasProfileNotFoundErrors = verificationResult.errors.some(err =>
        err.toLowerCase().includes('profile not found') ||
        err.toLowerCase().includes('not found') ||
        err.toLowerCase().includes('may be private')
      )

      const hasApiConfigErrors = verificationResult.errors.some(err =>
        err.includes('SOCIAVAULT_API_KEY') ||
        err.includes('not set')
      )

      return NextResponse.json(
        {
          success: false,
          error: hasApiConfigErrors
            ? 'Social media verification service is not configured. Please contact support.'
            : hasProfileNotFoundErrors
              ? 'Social media profile not found. Please verify your username is correct and the account exists and is public.'
              : 'Failed to verify social profiles',
          details: verificationResult.errors.length > 0
            ? verificationResult.errors
            : ['No valid social media profiles could be verified'],
          troubleshooting: hasApiConfigErrors ? {
            message: 'Service Configuration Issue',
            steps: [
              '1. SociaVault service is not properly configured',
              '2. Please contact support to enable social media verification',
              '3. You can use the manual social account linking feature as an alternative'
            ]
          } : hasProfileNotFoundErrors ? {
            message: 'Profile Not Found',
            steps: [
              '1. Double-check that your username is spelled correctly',
              '2. Verify the account exists and is public (not private)',
              '3. Try using the full profile URL instead of just the username',
              '4. If you recently created the account, wait a few hours for it to be indexed'
            ]
          } : undefined
        },
        { status: 400 }
      )
    }

    // Log warnings for failed platforms but don't block success
    if (verificationResult.errors.length > 0) {
      console.warn('Some social profiles failed to verify:', verificationResult.errors)
    }

    // Note: We no longer block verification if tier is 0
    // The tier will be recalculated using aggregated followers from all accounts
    // If the final tier is still 0/null, we'll store it as NULL but allow the verification to proceed

    // Store social accounts in database
    for (const [platform, analytics] of Object.entries(verificationResult.analytics)) {
      // Extract username from analytics data
      const username = analytics.username || '';
      
      // Check if account already exists
      const { data: existing } = await adminSupabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', creator.id)
        .eq('platform', platform)
        .single()

      if (existing) {
        // Update existing
        await adminSupabase
          .from('social_accounts')
          .update({
            handle: username,
            followers: analytics.followers,
            engagement_rate: analytics.engagementRate,
            verified_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        // Create new
        await adminSupabase
          .from('social_accounts')
          .insert({
            user_id: creator.id,
            platform: platform as 'instagram' | 'tiktok' | 'twitter',
            handle: username,
            followers: analytics.followers,
            engagement_rate: analytics.engagementRate,
            verified_at: new Date().toISOString(),
          })
      }
    }

    // CRITICAL: Recalculate tier using ALL connected social accounts (aggregated)
    // Fetch all verified social accounts to get complete picture
    const { data: allSocialAccounts } = await adminSupabase
      .from('social_accounts')
      .select('platform, followers, engagement_rate')
      .eq('user_id', creator.id)
      .not('verified_at', 'is', null);

    // Build metrics object from ALL verified accounts
    // CRITICAL: Prioritize newly verified data from verificationResult, then use existing accounts
    const metrics: SocialMetrics = {};
    
    // First, add all existing verified accounts (excluding ones being updated)
    const newlyVerifiedPlatforms = Object.keys(verificationResult.analytics);
    
    (allSocialAccounts || []).forEach((account) => {
      const platform = account.platform.toLowerCase();
      
      // Skip if this platform was just verified (use new data instead)
      if (newlyVerifiedPlatforms.includes(platform)) {
        return;
      }
      
      const followers = account.followers || 0;
      const engagement = account.engagement_rate || 0;
      const following = 0; // Not stored in DB
      
      if (platform === 'twitter' || platform === 'x') {
        metrics.twitter = {
          followers,
          following,
          engagement,
        };
      } else if (platform === 'instagram') {
        metrics.instagram = {
          followers,
          following,
          engagement,
        };
      } else if (platform === 'tiktok') {
        metrics.tiktok = {
          followers,
          engagement,
        };
      }
    });

    // Then, add/overwrite with newly verified accounts (these have the latest data)
    if (verificationResult.analytics.twitter) {
      const twitterAnalytics = verificationResult.analytics.twitter as TwitterAnalytics
      metrics.twitter = {
        followers: twitterAnalytics.followers,
        following: twitterAnalytics.following || 0,
        tweets: twitterAnalytics.tweets || 0,
        engagement: twitterAnalytics.engagementRate || 0,
      };
    }
    if (verificationResult.analytics.instagram) {
      const instagramAnalytics = verificationResult.analytics.instagram as InstagramAnalytics
      metrics.instagram = {
        followers: instagramAnalytics.followers,
        following: instagramAnalytics.following || 0,
        posts: instagramAnalytics.posts || 0,
        engagement: instagramAnalytics.engagementRate || 0,
      };
    }
    if (verificationResult.analytics.tiktok) {
      const tiktokAnalytics = verificationResult.analytics.tiktok as TikTokAnalytics
      metrics.tiktok = {
        followers: tiktokAnalytics.followers,
        engagement: tiktokAnalytics.engagementRate || 0,
      };
    }

    console.log('📊 Aggregated Metrics for Tier Calculation:', {
      metrics,
      totalAccounts: allSocialAccounts?.length || 0,
    });

    // Calculate tier using aggregated followers
    const tierResult = calculateTier(metrics);

    console.log('🎯 Final Tier Calculation Result:', {
      creatorId: creator.id,
      tier: tierResult.tier,
      tierName: tierResult.tierName,
      totalFollowers: tierResult.totalFollowers,
      engagementRate: tierResult.engagementRate,
      qualityScore: tierResult.qualityScore,
      meetsRequirements: tierResult.meetsRequirements,
      reason: tierResult.reason,
    });

    // Update user tier
    // CRITICAL: tier null (disqualified) should be stored as NULL in database
    const tierValue = tierResult.tier === null ? null : tierResult.tier;

    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        tier: tierValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id)

    if (updateError) {
      throw new ValidationError(updateError.message)
    }

    // Store analytics history
    await adminSupabase.from('creator_analytics_history').insert({
      creator_id: creator.id,
      tier: tierResult.tier || 0,
      analytics_data: verificationResult.analytics,
      created_at: new Date().toISOString(),
    })

    // Calculate commission rate
    const commissionRates: Record<number, string> = {
      1: '3.0%',
      2: '2.5%',
      3: '2.0%',
      4: '1.5%',
    };

    return NextResponse.json({
      success: true,
      tier: tierResult.tier,
      tierName: tierResult.tierName,
      totalFollowers: tierResult.totalFollowers,
      engagementRate: tierResult.engagementRate,
      qualityScore: tierResult.qualityScore,
      commission: tierResult.tier ? commissionRates[tierResult.tier] || '0%' : '0%',
      analytics: verificationResult.analytics,
      warnings: verificationResult.errors.length > 0 ? verificationResult.errors : undefined,
      message: tierResult.tier 
        ? `Congratulations! You've been verified as a ${tierResult.tierName} creator`
        : tierResult.reason || 'Your account does not meet minimum creator requirements',
      meetsRequirements: tierResult.meetsRequirements,
      reason: tierResult.reason,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

