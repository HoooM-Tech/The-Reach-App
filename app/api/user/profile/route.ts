import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors';

/**
 * GET /api/user/profile
 * 
 * Returns the authenticated user's profile information
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    // Use admin client to bypass RLS - user should always be able to access their own profile
    const adminSupabase = createAdminSupabaseClient();

    // Fetch user profile from database
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, phone, full_name, role, tier, kyc_status, avatar_url, company_name, cac_number, business_address, created_at, updated_at')
      .eq('id', currentUser.id)
      .single();

    if (userError || !user) {
      console.error('[Profile API] Error fetching user profile:', userError);
      console.error('[Profile API] Current user ID:', currentUser.id);
      throw new NotFoundError('User profile');
    }

    // For developers, calculate aggregated stats
    let profileStats = null;
    if (user.role === 'developer') {
      // Get total earned from escrow transactions
      const { data: escrowTransactions } = await adminSupabase
        .from('escrow_transactions')
        .select('amount')
        .eq('developer_id', currentUser.id);

      const totalEarned = escrowTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Get total properties sold (status = 'sold' indicates a completed sale)
      // Note: verification_status = 'verified' only means approved for listing, not sold
      const { count: soldCount } = await adminSupabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('developer_id', currentUser.id)
        .eq('status', 'sold');

      // Calculate average rating from properties (if rating system exists)
      const { data: properties } = await adminSupabase
        .from('properties')
        .select('rating')
        .eq('developer_id', currentUser.id)
        .not('rating', 'is', null);

      const averageRating = properties && properties.length > 0
        ? properties.reduce((sum, p) => sum + (p.rating || 0), 0) / properties.length
        : 0;

      profileStats = {
        earned: totalEarned,
        sold: soldCount || 0,
        rating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
      };
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
        tier: user.tier,
        kyc_status: user.kyc_status,
        avatar_url: user.avatar_url,
        company_name: user.company_name,
        cac_number: user.cac_number,
        business_address: user.business_address,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      stats: profileStats,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * PATCH /api/user/profile
 * 
 * Updates the authenticated user's profile information
 */
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    const body = await req.json();
    // Use admin client to bypass RLS - user should always be able to update their own profile
    const adminSupabase = createAdminSupabaseClient();

    // Allowed fields that can be updated
    const allowedFields = ['full_name', 'phone', 'company_name', 'cac_number', 'business_address', 'avatar_url'];
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only include allowed fields from request
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Validate email cannot be changed via profile update (use separate endpoint)
    if (body.email && body.email !== currentUser.email) {
      throw new ValidationError('Email cannot be changed via profile update');
    }

    // Update user profile
    const { data: updatedUser, error: updateError } = await adminSupabase
      .from('users')
      .update(updateData)
      .eq('id', currentUser.id)
      .select('id, email, phone, full_name, role, tier, kyc_status, avatar_url, company_name, cac_number, business_address, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[Profile API] Error updating user profile:', updateError);
      throw new ValidationError(updateError.message);
    }

    if (!updatedUser) {
      throw new NotFoundError('User profile');
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedUser,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
