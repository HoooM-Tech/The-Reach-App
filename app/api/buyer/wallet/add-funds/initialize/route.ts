import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireBuyer } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import { initializePayment } from '@/lib/services/paystack';
import { validateAmount, toKobo } from '@/lib/utils/currency';
import { generateTransactionReference } from '@/lib/utils/transaction-reference';
import { WalletErrorCode, createWalletError } from '@/lib/utils/wallet-errors';
import { checkRateLimit } from '@/lib/utils/rate-limit';

/**
 * POST /api/buyer/wallet/add-funds/initialize
 * Initialize Paystack card payment to add funds (buyer only)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireBuyer();

    const rateLimit = checkRateLimit(`deposit:${user.id}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.TRANSACTION_LIMIT_EXCEEDED,
            'Too many deposit requests. Please try again later.',
            { resetTime: rateLimit.resetTime }
          ),
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const amount = body?.amount;

    if (amount == null || typeof amount !== 'number') {
      return NextResponse.json(
        { success: false, error: createWalletError(WalletErrorCode.INVALID_AMOUNT, 'Amount is required') },
        { status: 400 }
      );
    }

    try {
      validateAmount(amount, 'deposit');
    } catch (error: unknown) {
      const err = error as { message?: string };
      return NextResponse.json(
        { success: false, error: createWalletError(WalletErrorCode.INVALID_AMOUNT, err.message ?? 'Invalid amount') },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, available_balance, locked_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') throw walletError;

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

    if (!wallet) throw new ValidationError('Wallet not found.');

    const userEmail = user.email;
    if (!userEmail) throw new ValidationError('User email not found');

    const reference = generateTransactionReference('deposit');

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        type: 'credit',
        category: 'deposit',
        amount: amount,
        fee: 0,
        total_amount: amount,
        net_amount: amount,
        currency: 'NGN',
        title: 'Wallet Deposit',
        description: 'Add funds to wallet',
        reference: reference,
        status: 'pending',
        initiated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transactionError) throw new ValidationError('Failed to create transaction record');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/dashboard/buyer/wallet/add-funds/card?reference=${reference}`;

    const payment = await initializePayment({
      email: userEmail,
      amount: toKobo(amount),
      reference,
      callback_url: callbackUrl,
      metadata: {
        wallet_id: wallet.id,
        transaction_id: transaction.id,
        user_id: user.id,
        user_type: 'buyer',
        transaction_type: 'wallet_deposit',
      },
    });

    if (!payment.status || !payment.data?.authorization_url) {
      await supabase
        .from('transactions')
        .update({ status: 'failed', failed_at: new Date().toISOString() })
        .eq('id', transaction.id);
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.PAYMENT_INITIALIZATION_FAILED,
            payment.message || 'Failed to initialize payment'
          ),
        },
        { status: 502 }
      );
    }

    await supabase
      .from('transactions')
      .update({
        payment_gateway: 'paystack',
        gateway_reference: payment.data.reference,
        paystack_reference: payment.data.reference,
        paystack_status: 'pending',
        authorization_url: payment.data.authorization_url,
        access_code: payment.data.access_code,
      })
      .eq('id', transaction.id);

    return NextResponse.json({
      success: true,
      authorizationUrl: payment.data.authorization_url,
      reference: payment.data.reference,
      data: {
        transaction: { id: transaction.id, reference, amount, status: 'pending' },
        payment: {
          authorization_url: payment.data.authorization_url,
          access_code: payment.data.access_code,
          reference: payment.data.reference,
        },
      },
      message: 'Payment initialized successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
