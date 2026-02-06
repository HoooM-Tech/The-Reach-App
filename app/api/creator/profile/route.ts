import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireCreator } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/creator/profile
 * 
 * Returns the creator's profile data with stats
 */
export async function GET(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const adminSupabase = createAdminSupabaseClient();

    // Get user profile
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, phone, full_name, avatar_url, tier, created_at')
      .eq('id', creator.id)
      .single();

    if (userError) {
      throw userError;
    }

    // Get social accounts with metrics
    const { data: socialAccounts } = await adminSupabase
      .from('social_accounts')
      .select('platform, handle, verified_at, followers, engagement_rate')
      .eq('user_id', creator.id)
      .order('created_at', { ascending: false });

    // Calculate stats
    // Earned: Sum of all payouts for this creator
    const { data: payouts } = await adminSupabase
      .from('payouts')
      .select('amount')
      .eq('creator_id', creator.id)
      .eq('status', 'completed');

    const totalEarned = payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Sold: Count of properties sold through creator's tracking links
    const { data: soldProperties } = await adminSupabase
      .from('tracking_links')
      .select('property_id')
      .eq('creator_id', creator.id)
      .not('conversions', 'is', null)
      .gt('conversions', 0);

    const soldCount = soldProperties?.length || 0;

    // Rating: Average rating from reviews (if reviews table exists)
    // For now, default to 5.00 if no reviews
    let rating = 5.0;
    try {
      const { data: reviews } = await adminSupabase
        .from('reviews')
        .select('rating')
        .eq('creator_id', creator.id);

      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        rating = totalRating / reviews.length;
      }
    } catch (reviewError) {
      // Reviews table might not exist, use default rating
      console.log('Reviews table not found or error:', reviewError);
    }

    // Format social accounts - include all supported platforms
    const formattedSocialAccounts = [
      { platform: 'instagram', connected: false, handle: null, followers: undefined, engagementRate: undefined },
      { platform: 'tiktok', connected: false, handle: null, followers: undefined, engagementRate: undefined },
      { platform: 'twitter', connected: false, handle: null, followers: undefined, engagementRate: undefined },
    ];

    if (socialAccounts) {
      socialAccounts.forEach((account) => {
        const platformKey = account.platform.toLowerCase();
        const index = formattedSocialAccounts.findIndex(
          (sa) => sa.platform === platformKey
        );
        if (index !== -1) {
          formattedSocialAccounts[index] = {
            platform: platformKey as 'instagram' | 'tiktok' | 'twitter',
            connected: !!account.verified_at,
            handle: account.handle || null,
            followers: account.followers || undefined,
            engagementRate: account.engagement_rate || undefined,
          };
        }
      });
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        tier: user.tier ?? 0,
        created_at: user.created_at,
      },
      stats: {
        earned: totalEarned,
        sold: soldCount,
        rating: Math.round(rating * 100) / 100, // Round to 2 decimal places
      },
      socialAccounts: formattedSocialAccounts,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * PATCH /api/creator/profile
 * 
 * Updates the creator's profile
 */
export async function PATCH(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const body = await req.json();
    const { full_name, email, phone, avatar_url } = body;

    const adminSupabase = createAdminSupabaseClient();

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Normalize phone number if provided
    if (phone !== undefined) {
      try {
        const { normalizeNigerianPhone } = await import('@/lib/utils/phone');
        updates.phone = normalizeNigerianPhone(phone);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    // Update profile
    const { data: updatedUser, error: updateError } = await adminSupabase
      .from('users')
      .update(updates)
      .eq('id', creator.id)
      .select('id, email, phone, full_name, avatar_url, tier')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      profile: updatedUser,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
