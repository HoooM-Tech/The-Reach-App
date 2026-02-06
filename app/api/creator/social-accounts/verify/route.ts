import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireCreator } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import {
  SociaVaultService,
  type InstagramAnalytics,
  type TikTokAnalytics,
  type TwitterAnalytics,
} from '@/lib/social-media/sociavault';
import { calculateTier, type SocialMetrics } from '@/lib/utils/tier-calculator';

/**
 * POST /api/creator/social-accounts/verify
 * 
 * Verifies a single social media platform and recalculates tier
 */
export async function POST(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const body = await req.json();
    const { platform, url } = body;

    if (!platform || !['instagram', 'tiktok', 'twitter'].includes(platform.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    const urlPatterns = {
      instagram: /instagram\.com\/([^/?]+)/i,
      tiktok: /tiktok\.com\/@?([^/?]+)/i,
      twitter: /(?:twitter\.com|x\.com)\/([^/?]+)/i,
    };

    const pattern = urlPatterns[platform.toLowerCase() as keyof typeof urlPatterns];
    if (!pattern.test(url)) {
      return NextResponse.json(
        { error: `Invalid ${platform} URL format. Please provide a full URL.` },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();

    // Check for duplicate
    const { data: existing } = await adminSupabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', creator.id)
      .eq('platform', platform.toLowerCase())
      .single();

    // Prepare social links object for verification
    const socialLinks: { instagram?: string; tiktok?: string; twitter?: string } = {};
    if (platform.toLowerCase() === 'instagram') {
      socialLinks.instagram = url;
    } else if (platform.toLowerCase() === 'tiktok') {
      socialLinks.tiktok = url;
    } else if (platform.toLowerCase() === 'twitter') {
      socialLinks.twitter = url;
    }

    // Verify using SociaVault
    const verificationResult = await SociaVaultService.verifyCreator(socialLinks);

    // Get the platform key used in SociaVault
    const platformKey = platform.toLowerCase();

    if (!verificationResult.success || !verificationResult.analytics[platformKey]) {
      const errorMessage = verificationResult.errors.join(', ') || 'Verification failed';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const platformAnalytics = verificationResult.analytics[platformKey];
    if (!platformAnalytics || !('followers' in platformAnalytics)) {
      return NextResponse.json(
        { error: 'Failed to get analytics data' },
        { status: 400 }
      );
    }

    // Extract data from platform analytics
    const followers = platformAnalytics.followers || 0;
    const engagementRate = platformAnalytics.engagementRate || 0;
    const qualityScore = platformAnalytics.qualityScore || 0;
    const username = platformAnalytics.username || '';

    // Store or update social account
    const accountData = {
      user_id: creator.id,
      platform: platform.toLowerCase(),
      handle: username,
      followers: followers,
      engagement_rate: engagementRate,
      verified_at: new Date().toISOString(),
    };

    if (existing) {
      await adminSupabase
        .from('social_accounts')
        .update(accountData)
        .eq('id', existing.id);
    } else {
      await adminSupabase
        .from('social_accounts')
        .insert(accountData);
    }

    // CRITICAL: Recalculate tier using ALL verified social accounts (aggregated)
    // Get all verified accounts (including the one we just verified)
    const { data: allSocialAccounts } = await adminSupabase
      .from('social_accounts')
      .select('platform, followers, engagement_rate')
      .eq('user_id', creator.id)
      .not('verified_at', 'is', null);

    // Build metrics object from ALL verified accounts
    // CRITICAL: Prioritize newly verified account data, then use existing accounts
    const metrics: SocialMetrics = {};
    
    // First, add all existing verified accounts (excluding the one being updated)
    (allSocialAccounts || []).forEach((account) => {
      const accountPlatform = account.platform.toLowerCase();
      
      // Skip if this is the platform being verified (use new data instead)
      if (accountPlatform === platformKey) {
        return;
      }
      
      const accountFollowers = account.followers || 0;
      const accountEngagement = account.engagement_rate || 0;
      const accountFollowing = 0; // Not stored in DB
      
      if (accountPlatform === 'twitter' || accountPlatform === 'x') {
        metrics.twitter = {
          followers: accountFollowers,
          following: accountFollowing,
          engagement: accountEngagement,
        };
      } else if (accountPlatform === 'instagram') {
        metrics.instagram = {
          followers: accountFollowers,
          following: accountFollowing,
          engagement: accountEngagement,
        };
      } else if (accountPlatform === 'tiktok') {
        metrics.tiktok = {
          followers: accountFollowers,
          engagement: accountEngagement,
        };
      }
    });

    // Then, add/overwrite with newly verified account (has the latest data)
    if (verificationResult.analytics[platformKey]) {
      const newAnalytics = verificationResult.analytics[platformKey];
      if (platformKey === 'twitter') {
        const twitterAnalytics = newAnalytics as TwitterAnalytics;
        metrics.twitter = {
          followers: twitterAnalytics.followers || followers,
          following: twitterAnalytics.following || 0,
          tweets: twitterAnalytics.tweets || 0,
          engagement: twitterAnalytics.engagementRate || engagementRate,
        };
      } else if (platformKey === 'instagram') {
        const instagramAnalytics = newAnalytics as InstagramAnalytics;
        metrics.instagram = {
          followers: instagramAnalytics.followers || followers,
          following: instagramAnalytics.following || 0,
          posts: instagramAnalytics.posts || 0,
          engagement: instagramAnalytics.engagementRate || engagementRate,
        };
      } else if (platformKey === 'tiktok') {
        const tiktokAnalytics = newAnalytics as TikTokAnalytics;
        metrics.tiktok = {
          followers: tiktokAnalytics.followers || followers,
          engagement: tiktokAnalytics.engagementRate || engagementRate,
        };
      }
    }

    console.log('📊 Aggregated Metrics for Tier Calculation:', {
      creatorId: creator.id,
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

    // CRITICAL: tier null (disqualified) should be stored as NULL in database
    const tierValue = tierResult.tier === null ? null : tierResult.tier;
    
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        tier: tierValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id);

    if (updateError) {
      console.error('Failed to update tier:', updateError);
      // Don't fail the request, but log the error
    }

    // Store analytics history
    try {
      await adminSupabase.from('creator_analytics_history').insert({
        creator_id: creator.id,
        tier: tierResult.tier || 0,
        analytics_data: verificationResult.analytics,
        created_at: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error('Failed to store analytics history:', err);
      // Non-critical error
    }

    // Calculate commission rate
    const commissionRates: Record<number, string> = {
      1: '3.0%',
      2: '2.5%',
      3: '2.0%',
      4: '1.5%',
    };

    return NextResponse.json({
      success: true,
      platform: platform.toLowerCase(),
      connected: true,
      handle: username,
      followers,
      engagementRate,
      tier: tierResult.tier,
      tierName: tierResult.tierName,
      totalFollowers: tierResult.totalFollowers,
      qualityScore: tierResult.qualityScore,
      commission: tierResult.tier ? commissionRates[tierResult.tier] || '0%' : '0%',
      message: tierResult.tier 
        ? `Social account verified and connected successfully. You are now a ${tierResult.tierName} creator.`
        : tierResult.reason || 'Social account verified but does not meet minimum tier requirements.',
      meetsRequirements: tierResult.meetsRequirements,
      reason: tierResult.reason,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
