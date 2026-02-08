import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireBuyer } from '@/lib/utils/auth';
import { handleError, NotFoundError } from '@/lib/utils/errors';

/**
 * GET /api/buyer/wallet/balance
 * Get wallet balance (buyer only). Creates wallet with user_type 'buyer' if missing.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireBuyer();
    const supabase = createAdminSupabaseClient();

    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, available_balance, locked_balance, is_setup, user_type')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          user_type: 'buyer',
          available_balance: 0,
          locked_balance: 0,
          is_setup: false,
        })
        .select()
        .single();

      if (createError) throw createError;
      wallet = newWallet;
    }

    if (!wallet) {
      throw new NotFoundError('Wallet');
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
        currency: (wallet as any).currency || 'NGN',
        wallet_id: wallet.id,
        is_setup: wallet.is_setup || false,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
