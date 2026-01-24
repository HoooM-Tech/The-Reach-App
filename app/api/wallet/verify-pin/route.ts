import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, ValidationError, AuthenticationError } from '@/lib/utils/errors';
import bcrypt from 'bcryptjs';

/**
 * POST /api/wallet/verify-pin
 * 
 * Verify wallet PIN
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { pin } = await req.json();

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new ValidationError('Invalid PIN format');
    }

    const supabase = createAdminSupabaseClient();

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, pin_hash, pin_attempts, pin_locked_until, is_setup')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new ValidationError('Wallet not found. Please set up your wallet first.');
    }

    if (!wallet.is_setup) {
      throw new ValidationError('Wallet is not set up');
    }

    // Check if PIN is locked
    if (wallet.pin_locked_until) {
      const lockedUntil = new Date(wallet.pin_locked_until);
      if (lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        throw new AuthenticationError(
          `PIN is locked. Try again in ${minutesLeft} minute(s).`
        );
      }
      // Unlock if lock period has passed
      await supabase
        .from('wallets')
        .update({
          pin_attempts: 0,
          pin_locked_until: null,
        })
        .eq('id', wallet.id);
    }

    // Verify PIN
    if (!wallet.pin_hash) {
      throw new ValidationError('PIN not set. Please set up your wallet.');
    }

    const isValid = await bcrypt.compare(pin, wallet.pin_hash);

    if (!isValid) {
      const newAttempts = (wallet.pin_attempts || 0) + 1;
      const maxAttempts = 3;

      if (newAttempts >= maxAttempts) {
        // Lock for 30 minutes
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await supabase
          .from('wallets')
          .update({
            pin_attempts: newAttempts,
            pin_locked_until: lockedUntil.toISOString(),
          })
          .eq('id', wallet.id);

        throw new AuthenticationError(
          'Too many failed attempts. PIN locked for 30 minutes.'
        );
      }

      // Update attempts
      await supabase
        .from('wallets')
        .update({ pin_attempts: newAttempts })
        .eq('id', wallet.id);

      const attemptsLeft = maxAttempts - newAttempts;
      throw new AuthenticationError(
        `Invalid PIN. ${attemptsLeft} attempt(s) remaining.`
      );
    }

    // Reset attempts on successful verification
    await supabase
      .from('wallets')
      .update({
        pin_attempts: 0,
        pin_locked_until: null,
      })
      .eq('id', wallet.id);

    return NextResponse.json({
      success: true,
      valid: true,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
