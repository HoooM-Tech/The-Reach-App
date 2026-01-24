import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, NotFoundError } from '@/lib/utils/errors';

/**
 * GET /api/wallet/balance
 * 
 * Get wallet balance
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = createAdminSupabaseClient();

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, available_balance, locked_balance, is_setup, user_type')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    // Create wallet if it doesn't exist
    if (!wallet) {
      const userType = user.role === 'creator' ? 'creator' : 'developer';
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          user_type: userType,
          available_balance: 0,
          locked_balance: 0,
          is_setup: false,
        })
        .select()
        .single();

      if (createError) throw createError;
      wallet = newWallet;
    }

    const availableBalance = parseFloat(wallet.available_balance || 0);
    const lockedBalance = parseFloat(wallet.locked_balance || 0);
    const totalBalance = availableBalance + lockedBalance;

    return NextResponse.json({
      success: true,
      data: {
        balance: totalBalance,
        available_balance: availableBalance,
        locked_balance: lockedBalance,
        currency: wallet.currency || 'NGN',
        wallet_id: wallet.id,
        is_setup: wallet.is_setup || false,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
