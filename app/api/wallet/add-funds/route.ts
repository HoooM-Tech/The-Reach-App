import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
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
    // Use route handler client for API routes - it properly handles cookies
    const routeSupabase = createRouteHandlerClient();
    
    // Get authenticated user from Supabase session
    const { data: { user: authUser }, error: authError } = await routeSupabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get user from database and check role
    const adminSupabase = createAdminSupabaseClient();
    const { data: developerUser, error: developerUserError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (developerUserError || !developerUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user is developer or admin
    if (developerUser.role !== 'developer' && developerUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only developers can add funds to their wallet' },
        { status: 403 }
      );
    }
    
    const developer = developerUser;

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

    // CRITICAL: Check for existing pending transactions for this user
    // Paystack requires old transactions to be finalized before new ones
    const { data: pendingTransactions, error: pendingCheckError } = await supabase
      .from('transactions')
      .select('id, reference, status, created_at')
      .eq('user_id', developer.id)
      .eq('category', 'deposit')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (pendingCheckError) {
      console.error('Error checking pending transactions:', pendingCheckError);
    }

    // If there are pending transactions older than 5 minutes, mark them as failed
    // This prevents Paystack from thinking transactions are still ongoing
    if (pendingTransactions && pendingTransactions.length > 0) {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      for (const pendingTx of pendingTransactions) {
        const txDate = new Date(pendingTx.created_at);
        if (txDate < fiveMinutesAgo) {
          console.warn(`Marking stale pending transaction ${pendingTx.reference} as failed`);
          await supabase
            .from('transactions')
            .update({ 
              status: 'failed',
              failed_at: new Date().toISOString(),
            })
            .eq('id', pendingTx.id);
        }
      }

      // Check if there are still active pending transactions (less than 5 minutes old)
      const activePending = pendingTransactions.filter(tx => {
        const txDate = new Date(tx.created_at);
        return txDate >= fiveMinutesAgo;
      });

      if (activePending.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: createWalletError(
              WalletErrorCode.TRANSACTION_LIMIT_EXCEEDED,
              'You have a pending transaction. Please wait for it to complete or try again in a few minutes.',
              {
                pendingReference: activePending[0].reference,
              }
            ),
          },
          { status: 409 } // Conflict status
        );
      }
    }

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, user_id, available_balance, locked_balance')
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

    // Get user email for Paystack (already have developerUser with email)
    const userEmail = developer.email;
    
    if (!userEmail) {
      throw new ValidationError('User email not found');
    }

    // Calculate fee
    const fee = calculateDepositFee(amount);
    const netAmount = amount - fee;

    // Ensure wallet exists
    if (!wallet) {
      throw new ValidationError('Wallet not found. Please set up your wallet first.');
    }

    // Generate transaction reference using UUID (globally unique)
    // No need to check for duplicates - UUID ensures uniqueness
    const reference = generateTransactionReference('deposit');

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
    // Paystack redirects to callback_url after payment with trxref and reference params
    // We use a success page that extracts the reference and redirects to verify
    const callbackUrl =
      callback_url ||
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/developer/wallet/add-funds/success?reference=${reference}`;

    try {
      // CRITICAL: Verify reference is unique in Paystack's system
      // Paystack will reject if reference was used before
      const payment = await initializePayment({
        email: userEmail,
        amount: toKobo(amount), // Convert to kobo
        reference: reference, // UUID-based reference ensures uniqueness
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
          .update({ 
            status: 'failed',
            failed_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        console.error(`❌ Paystack initialization failed for reference ${reference}:`, payment);
        
        return NextResponse.json(
          {
            success: false,
            error: createWalletError(
              WalletErrorCode.PAYMENT_INITIALIZATION_FAILED,
              payment.message || 'Failed to initialize payment with Paystack'
            ),
          },
          { status: 502 }
        );
      }

      // Log successful initialization
      console.log(`✅ Payment initialized successfully for reference ${reference}`);

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
