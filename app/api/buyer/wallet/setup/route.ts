import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireBuyer } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import bcrypt from 'bcryptjs';

/**
 * POST /api/buyer/wallet/setup
 * Create wallet with PIN setup (buyer only). Uses user_type 'buyer'.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireBuyer();

    let body;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid request body');
    }

    const { pin, confirmPin } = body;

    if (!pin || !confirmPin) {
      throw new ValidationError('PIN and confirmation are required');
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new ValidationError('PIN must be exactly 4 digits');
    }

    if (pin !== confirmPin) {
      throw new ValidationError('PINs do not match');
    }

    const supabase = createAdminSupabaseClient();

    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id, is_setup')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingWallet?.is_setup) {
      return NextResponse.json({
        success: true,
        wallet: {
          id: existingWallet.id,
          is_setup: true,
          available_balance: 0,
          locked_balance: 0,
        },
        message: 'Wallet is already set up',
      });
    }

    const pinHash = await bcrypt.hash(pin, 12);

    const walletData = {
      user_id: user.id,
      user_type: 'buyer',
      pin_hash: pinHash,
      is_setup: true,
      is_active: true,
      pin_attempts: 0,
      pin_locked_until: null,
    };

    let wallet;
    if (existingWallet) {
      const { data, error } = await supabase
        .from('wallets')
        .update(walletData)
        .eq('id', existingWallet.id)
        .select()
        .single();
      if (error) throw error;
      wallet = data;
    } else {
      const { data, error } = await supabase
        .from('wallets')
        .insert(walletData)
        .select()
        .single();
      if (error) throw error;
      wallet = data;
    }

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        is_setup: wallet.is_setup,
        available_balance: wallet.available_balance,
        locked_balance: wallet.locked_balance,
      },
      message: 'Wallet set up successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
