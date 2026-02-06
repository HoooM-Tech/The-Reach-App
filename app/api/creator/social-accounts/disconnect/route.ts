import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireCreator } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';
import { calculateTier, type SocialMetrics } from '@/lib/utils/tier-calculator';

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

    // CRITICAL: Recalculate tier using ALL remaining verified social accounts (aggregated)
    const { data: remainingAccounts } = await adminSupabase
      .from('social_accounts')
      .select('platform, followers, engagement_rate')
      .eq('user_id', creator.id)
      .not('verified_at', 'is', null);

    // Build metrics object from ALL remaining verified accounts
    const metrics: SocialMetrics = {};
    
    (remainingAccounts || []).forEach((account) => {
      const accountPlatform = account.platform.toLowerCase();
      const accountFollowers = account.followers || 0;
      const accountEngagement = account.engagement_rate || 0;
      // Following count not stored in DB, use 0 as default
      const accountFollowing = 0;
      
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
      } else if (accountPlatform === 'facebook') {
        metrics.facebook = {
          followers: accountFollowers,
          engagement: accountEngagement,
        };
      }
    });

    console.log('📊 Recalculating tier after disconnect:', {
      creatorId: creator.id,
      disconnectedPlatform: platform,
      remainingMetrics: metrics,
      remainingAccounts: remainingAccounts?.length || 0,
    });

    // Calculate tier using aggregated followers from remaining accounts
    const tierResult = calculateTier(metrics);

    console.log('🎯 Tier recalculation after disconnect:', {
      creatorId: creator.id,
      tier: tierResult.tier,
      tierName: tierResult.tierName,
      totalFollowers: tierResult.totalFollowers,
      engagementRate: tierResult.engagementRate,
      qualityScore: tierResult.qualityScore,
    });

    const newTier = tierResult.tier;
    const commissionRates: Record<number, string> = {
      1: '3.0%',
      2: '2.5%',
      3: '2.0%',
      4: '1.5%',
    };
    const newCommission = newTier ? commissionRates[newTier] || '0%' : '0%';

    // CRITICAL: tier null (disqualified) should be stored as NULL in database
    const tierValue = newTier === null ? null : newTier;
    
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        tier: tierValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id);

    if (updateError) {
      console.error('Failed to update tier after disconnect:', updateError);
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
        tier: newTier || 0,
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
      tierName: tierResult.tierName,
      totalFollowers: tierResult.totalFollowers,
      commission: newCommission,
      message: newTier 
        ? `Social account disconnected. You are now a ${tierResult.tierName} creator.`
        : 'Social account disconnected. You no longer meet minimum tier requirements.',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
