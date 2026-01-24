import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import { SociaVaultService } from '@/lib/social-media/sociavault';
import { calculateCreatorTier, calculateTierFromMultiplePlatforms } from '@/lib/utils/tier-calculation';

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

    // Recalculate tier from all verified social accounts
    // Get all verified accounts (including the one we just verified)
    const { data: allSocialAccounts } = await adminSupabase
      .from('social_accounts')
      .select('platform, followers, engagement_rate')
      .eq('user_id', creator.id)
      .not('verified_at', 'is', null);

    // Get quality scores from the most recent analytics history
    // This contains the quality scores calculated by SociaVault
    const { data: recentAnalytics } = await adminSupabase
      .from('creator_analytics_history')
      .select('analytics_data')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const analyticsData = recentAnalytics?.analytics_data as any;

    // Build platform data with quality scores from analytics
    // Merge current verification result with existing analytics
    const mergedAnalytics = {
      ...(analyticsData || {}),
      ...verificationResult.analytics,
    };

    // Build platform data array - ensure newly verified account is included
    const platformData = (allSocialAccounts || []).map((account) => {
      let qualityScoreValue = 0;

      // Get quality score from merged analytics data
      const accountPlatformKey = account.platform.toLowerCase();
      if (mergedAnalytics[accountPlatformKey] && mergedAnalytics[accountPlatformKey].qualityScore) {
        qualityScoreValue = mergedAnalytics[accountPlatformKey].qualityScore;
      } else {
        // Fallback: Use the quality score from current verification if this is the account we just verified
        if (account.platform.toLowerCase() === platform.toLowerCase()) {
          qualityScoreValue = qualityScore;
        } else {
          // For other accounts, estimate quality score (should be in analytics history)
          // This is a fallback - ideally all accounts should have quality scores in analytics
          const engagementRate = account.engagement_rate || 0;
          const followers = account.followers || 0;
          
          if (account.platform === 'instagram') {
            qualityScoreValue = Math.min(
              100,
              engagementRate * 10 +
              (followers >= 10000 ? 20 : 0) +
              (followers >= 50000 ? 20 : 0)
            );
          } else if (account.platform === 'tiktok') {
            qualityScoreValue = Math.min(
              100,
              engagementRate * 8 +
              (followers >= 10000 ? 20 : 0) +
              (followers >= 50000 ? 20 : 0)
            );
          } else if (account.platform === 'twitter') {
            qualityScoreValue = Math.min(
              100,
              (followers / 5000) +
              (followers >= 10000 ? 20 : 0) +
              (followers >= 50000 ? 20 : 0)
            );
          } else {
            qualityScoreValue = Math.min(100, engagementRate * 10);
          }
        }
      }

      return {
        followers: account.followers || 0,
        engagementRate: account.engagement_rate || 0,
        qualityScore: qualityScoreValue,
      };
    });

    // Ensure the newly verified account is included (in case of race condition)
    const hasNewAccount = platformData.some(
      (p) => p.followers === followers && p.engagementRate === engagementRate
    );
    if (!hasNewAccount) {
      platformData.push({
        followers,
        engagementRate,
        qualityScore,
      });
    }

    // Get the highest tier from all platforms
    const tierResult = calculateTierFromMultiplePlatforms(platformData);

    // Update creator tier (tier 0 is valid for unqualified creators)
    // Set to NULL if tier is 0 to match database constraint (or update constraint to allow 0)
    const tierValue = tierResult.tier === 0 ? null : tierResult.tier;
    
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        tier: tierValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id);

    if (updateError) {
      console.error('Failed to update tier:', updateError);
      // Try with tier 0 if NULL failed (in case constraint allows 0)
      if (tierValue === null && tierResult.tier === 0) {
        const { error: retryError } = await adminSupabase
          .from('users')
          .update({
            tier: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', creator.id);
        if (retryError) {
          console.error('Failed to update tier with 0:', retryError);
        }
      }
      // Don't fail the request, but log the error
    }

    // Store analytics history with merged analytics data
    // This includes all platforms with their quality scores
    try {
      await adminSupabase.from('creator_analytics_history').insert({
        creator_id: creator.id,
        tier: tierResult.tier,
        analytics_data: mergedAnalytics,
        created_at: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error('Failed to store analytics history:', err);
      // Non-critical error
    }

    return NextResponse.json({
      success: true,
      platform: platform.toLowerCase(),
      connected: true,
      handle: username,
      followers,
      engagementRate,
      tier: tierResult.tier,
      commission: tierResult.commission,
      message: 'Social account verified and connected successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
