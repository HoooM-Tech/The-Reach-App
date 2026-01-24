import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser, requireDeveloper } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import { initializePayment } from '@/lib/services/paystack';
import { validateAmount, toKobo, calculateDepositFee } from '@/lib/utils/currency';
import { generateTransactionReference } from '@/lib/utils/transaction-reference';
import { WalletErrorCode, createWalletError } from '@/lib/utils/wallet-errors';
import { logWalletActivity } from '@/lib/utils/wallet-activity';
import { checkRateLimit } from '@/lib/utils/rate-limit';

/**
 * POST /api/wallet/add-funds
 * 
 * Initialize payment to add funds to wallet (Developer only)
 */
export async function POST(req: NextRequest) {
  try {
    const developer = await requireDeveloper();

    // Rate limiting: Max 5 deposit requests per 15 minutes
    const rateLimit = checkRateLimit(
      `deposit:${developer.id}`,
      5,
      15 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.TRANSACTION_LIMIT_EXCEEDED,
            'Too many deposit requests. Please try again later.',
            {
              resetTime: rateLimit.resetTime,
            }
          ),
        },
        { status: 429 }
      );
    }

    const { amount, callback_url, metadata } = await req.json();

    // Validate amount
    try {
      validateAmount(amount, 'deposit');
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.INVALID_AMOUNT,
            error.message
          ),
        },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, user_id')
      .eq('user_id', developer.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    if (!wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: developer.id,
          user_type: 'developer',
          available_balance: 0,
          locked_balance: 0,
          is_setup: false,
        })
        .select()
        .single();

      if (createError) throw createError;
      wallet = newWallet;
    }

    // Get user email for Paystack
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', developer.id)
      .single();

    if (userError || !user?.email) {
      throw new ValidationError('User email not found');
    }

    // Calculate fee
    const fee = calculateDepositFee(amount);
    const netAmount = amount - fee;

    // Generate transaction reference (check for duplicates)
    let reference = generateTransactionReference('deposit');
    let attempts = 0;
    while (attempts < 5) {
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference', reference)
        .maybeSingle();

      if (!existingTransaction) {
        break; // Unique reference found
      }
      reference = generateTransactionReference('deposit');
      attempts++;
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: developer.id,
        type: 'credit',
        category: 'deposit',
        amount: amount,
        fee: fee,
        total_amount: netAmount,
        net_amount: netAmount,
        currency: 'NGN',
        title: 'Wallet Deposit',
        description: 'Add funds to wallet',
        reference: reference,
        status: 'pending',
        initiated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new ValidationError('Failed to create transaction record');
    }

    // Initialize Paystack payment
    const callbackUrl =
      callback_url ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/developer/wallet/verify?reference=${reference}`;

    try {
      const payment = await initializePayment({
        email: user.email,
        amount: toKobo(amount), // Convert to kobo
        reference: reference,
        callback_url: callbackUrl,
        metadata: {
          wallet_id: wallet.id,
          transaction_id: transaction.id,
          user_id: developer.id,
          user_type: 'developer',
          transaction_type: 'wallet_deposit',
          ...metadata,
        },
      });

      if (!payment.status || !payment.data?.authorization_url) {
        // Update transaction status to failed
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);

        return NextResponse.json(
          {
            success: false,
            error: createWalletError(
              WalletErrorCode.PAYMENT_INITIALIZATION_FAILED,
              'Failed to initialize payment with Paystack'
            ),
          },
          { status: 502 }
        );
      }

      // Update transaction with Paystack details
      await supabase
        .from('transactions')
        .update({
          payment_gateway: 'paystack',
          gateway_reference: payment.data.reference,
          paystack_reference: payment.data.reference,
          paystack_status: 'pending',
          authorization_url: payment.data.authorization_url,
          access_code: payment.data.access_code,
          metadata: {
            user_id: developer.id,
            user_type: 'developer',
            transaction_type: 'wallet_deposit',
            ...metadata,
          },
        })
        .eq('id', transaction.id);

      // Log wallet activity
      await logWalletActivity({
        wallet_id: wallet.id,
        user_id: developer.id,
        action: 'deposit_initiated',
        previous_balance: parseFloat(wallet.available_balance || 0),
        new_balance: parseFloat(wallet.available_balance || 0),
        amount_changed: 0,
        transaction_id: transaction.id,
        description: `Deposit of ${amount} NGN initiated`,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({
        success: true,
        data: {
          transaction: {
            id: transaction.id,
            reference: transaction.reference,
            amount: parseFloat(transaction.amount),
            fee: parseFloat(transaction.fee),
            net_amount: parseFloat(transaction.total_amount),
            status: transaction.status,
          },
          payment: {
            authorization_url: payment.data.authorization_url,
            access_code: payment.data.access_code,
            reference: payment.data.reference,
          },
        },
        message: 'Payment initialized successfully',
      });
    } catch (paystackError: any) {
      // Update transaction status to failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      console.error('Paystack initialization error:', paystackError);
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.PAYSTACK_API_ERROR,
            paystackError.message || 'Failed to initialize payment'
          ),
        },
        { status: 502 }
      );
    }
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
