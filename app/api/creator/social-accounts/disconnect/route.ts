import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';
import { calculateTierFromMultiplePlatforms } from '@/lib/utils/tier-calculation';

/**
 * DELETE /api/creator/social-accounts/disconnect
 * 
 * Disconnects a social account and recalculates tier
 */
export async function DELETE(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');

    if (!platform || !['instagram', 'tiktok', 'twitter'].includes(platform.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();

    // Verify the account exists and belongs to creator
    const { data: existingAccount } = await adminSupabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', creator.id)
      .eq('platform', platform.toLowerCase())
      .single();

    if (!existingAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Delete the social account
    const { error: deleteError } = await adminSupabase
      .from('social_accounts')
      .delete()
      .eq('user_id', creator.id)
      .eq('platform', platform.toLowerCase());

    if (deleteError) {
      throw deleteError;
    }

    // Recalculate tier from remaining verified social accounts
    const { data: remainingAccounts } = await adminSupabase
      .from('social_accounts')
      .select('platform, followers, engagement_rate')
      .eq('user_id', creator.id)
      .not('verified_at', 'is', null);

    let newTier = 0;
    let newCommission = 0;

    if (remainingAccounts && remainingAccounts.length > 0) {
      // Get quality scores from analytics history
      const { data: recentAnalytics } = await adminSupabase
        .from('creator_analytics_history')
        .select('analytics_data')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const analyticsData = recentAnalytics?.analytics_data as any;

      // Build platform data with quality scores
      const platformData = remainingAccounts.map((account) => {
        let qualityScoreValue = 0;

        // Get quality score from analytics data
        const accountPlatformKey = account.platform.toLowerCase();
        if (analyticsData && analyticsData[accountPlatformKey] && analyticsData[accountPlatformKey].qualityScore) {
          qualityScoreValue = analyticsData[accountPlatformKey].qualityScore;
        } else {
          // Fallback: Estimate quality score
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

        return {
          followers: account.followers || 0,
          engagementRate: account.engagement_rate || 0,
          qualityScore: qualityScoreValue,
        };
      });

      // Calculate tier from remaining platforms
      const tierResult = calculateTierFromMultiplePlatforms(platformData);
      newTier = tierResult.tier;
      newCommission = tierResult.commission;
    } else {
      // No verified platforms remaining - tier = 0
      newTier = 0;
      newCommission = 0;
    }

    // Update creator tier (tier 0 is valid for unqualified creators)
    // Set to NULL if tier is 0 to match database constraint (or update constraint to allow 0)
    const tierValue = newTier === 0 ? null : newTier;
    
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        tier: tierValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id);

    if (updateError) {
      console.error('Failed to update tier after disconnect:', updateError);
      // Try with tier 0 if NULL failed (in case constraint allows 0)
      if (tierValue === null && newTier === 0) {
        const { error: retryError } = await adminSupabase
          .from('users')
          .update({
            tier: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', creator.id);
        if (retryError) {
          console.error('Failed to update tier with 0 after disconnect:', retryError);
        }
      }
      // Don't fail the request, but log the error
    }

    // Store analytics history with updated tier
    const { data: recentAnalytics } = await adminSupabase
      .from('creator_analytics_history')
      .select('analytics_data')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const analyticsData = recentAnalytics?.analytics_data as any;
    const updatedAnalytics = { ...(analyticsData || {}) };
    
    // Remove the disconnected platform from analytics
    if (updatedAnalytics[platform.toLowerCase()]) {
      delete updatedAnalytics[platform.toLowerCase()];
    }

    try {
      await adminSupabase.from('creator_analytics_history').insert({
        creator_id: creator.id,
        tier: newTier,
        analytics_data: updatedAnalytics,
        created_at: new Date().toISOString(),
      });
    } catch (err: unknown) {
      console.error('Failed to store analytics history:', err);
      // Non-critical error
    }

    return NextResponse.json({
      success: true,
      platform: platform.toLowerCase(),
      disconnected: true,
      tier: newTier,
      commission: newCommission,
      message: 'Social account disconnected and tier recalculated',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
