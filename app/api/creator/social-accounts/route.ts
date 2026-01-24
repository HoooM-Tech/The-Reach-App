import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/creator/social-accounts
 * 
 * Returns the creator's connected social accounts
 */
export async function GET(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const adminSupabase = createAdminSupabaseClient();

    const { data: socialAccounts, error } = await adminSupabase
      .from('social_accounts')
      .select('platform, handle, verified_at, created_at')
      .eq('user_id', creator.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format response
    const formatted = (socialAccounts || []).map((account) => ({
      platform: account.platform.toLowerCase(),
      handle: account.handle,
      connected: !!account.verified_at,
      connectedAt: account.verified_at,
    }));

    return NextResponse.json({ accounts: formatted });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * POST /api/creator/social-accounts/connect
 * 
 * Connects a social account (OAuth flow would be handled separately)
 */
export async function POST(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const body = await req.json();
    const { platform, handle, oauthData } = body;

    if (!platform || !['instagram', 'tiktok', 'twitter'].includes(platform.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();

    // Upsert social account
    const { data: account, error } = await adminSupabase
      .from('social_accounts')
      .upsert(
        {
          user_id: creator.id,
          platform: platform.toLowerCase(),
          handle: handle || oauthData?.username,
          verified_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      account: {
        platform: account.platform,
        handle: account.handle,
        connected: true,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

