import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import { initiateTransfer, createTransferRecipient } from '@/lib/services/paystack';
import { validateAmount, toKobo, calculateWithdrawalFee } from '@/lib/utils/currency';
import { generateTransactionReference } from '@/lib/utils/transaction-reference';
import { WalletErrorCode, createWalletError } from '@/lib/utils/wallet-errors';
import { checkWithdrawalLimits } from '@/lib/utils/withdrawal-limits';
import { logWalletActivity } from '@/lib/utils/wallet-activity';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import bcrypt from 'bcryptjs';

/**
 * POST /api/wallet/withdraw
 * 
 * Initiate withdrawal
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    // Rate limiting: Max 3 withdrawal requests per hour
    const rateLimit = checkRateLimit(
      `withdraw:${user.id}`,
      3,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.TRANSACTION_LIMIT_EXCEEDED,
            'Too many withdrawal requests. Please try again later.',
            {
              resetTime: rateLimit.resetTime,
            }
          ),
        },
        { status: 429 }
      );
    }

    const { amount, bankAccountId, pin, narration } = await req.json();

    // Validate amount
    try {
      validateAmount(amount, 'withdrawal');
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

    if (!bankAccountId) {
      throw new ValidationError('Bank account is required');
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new ValidationError('Invalid PIN');
    }

    const supabase = createAdminSupabaseClient();

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, available_balance, locked_balance, pin_hash, pin_attempts, pin_locked_until, is_setup')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new ValidationError('Wallet not found. Please set up your wallet first.');
    }

    if (!wallet.is_setup) {
      throw new ValidationError('Wallet is not set up');
    }

    // Verify PIN
    if (!wallet.pin_hash) {
      throw new ValidationError('PIN not set');
    }

    // Check if PIN is locked
    if (wallet.pin_locked_until) {
      const lockedUntil = new Date(wallet.pin_locked_until);
      if (lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        throw new ValidationError(`PIN is locked. Try again in ${minutesLeft} minute(s).`);
      }
    }

    const isValidPin = await bcrypt.compare(pin, wallet.pin_hash);
    if (!isValidPin) {
      const newAttempts = (wallet.pin_attempts || 0) + 1;
      const maxAttempts = 3;

      if (newAttempts >= maxAttempts) {
        const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        await supabase
          .from('wallets')
          .update({
            pin_attempts: newAttempts,
            pin_locked_until: lockedUntil.toISOString(),
          })
          .eq('id', wallet.id);

        throw new ValidationError('Too many failed attempts. PIN locked for 30 minutes.');
      }

      await supabase
        .from('wallets')
        .update({ pin_attempts: newAttempts })
        .eq('id', wallet.id);

      const attemptsLeft = maxAttempts - newAttempts;
      throw new ValidationError(`Invalid PIN. ${attemptsLeft} attempt(s) remaining.`);
    }

    // Reset PIN attempts on success
    await supabase
      .from('wallets')
      .update({
        pin_attempts: 0,
        pin_locked_until: null,
      })
      .eq('id', wallet.id);

    // Check withdrawal limits (daily/monthly)
    try {
      await checkWithdrawalLimits(user.id, amount);
    } catch (limitError: any) {
      return NextResponse.json(
        {
          success: false,
          error: limitError,
        },
        { status: 429 }
      );
    }

    // Check balance
    const availableBalance = parseFloat(wallet.available_balance || 0);
    const { fee, netAmount } = calculateWithdrawalFee(amount);
    const totalAmount = amount; // Total to deduct (amount + fee)

    if (availableBalance < totalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.INSUFFICIENT_BALANCE,
            'Insufficient wallet balance',
            {
              required: totalAmount,
              available: availableBalance,
            }
          ),
        },
        { status: 400 }
      );
    }

    // Get bank account
    const { data: bankAccount, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .eq('wallet_id', wallet.id)
      .single();

    if (accountError || !bankAccount) {
      throw new ValidationError('Bank account not found');
    }

    // Create transfer recipient if not exists
    let recipientCode = bankAccount.recipient_code;
    if (!recipientCode) {
      try {
        const recipient = await createTransferRecipient(
          bankAccount.account_number,
          bankAccount.bank_code,
          bankAccount.account_name
        );
        if (recipient.status && recipient.data?.recipient_code) {
          recipientCode = recipient.data.recipient_code;
          // Update bank account with recipient code
          await supabase
            .from('bank_accounts')
            .update({ recipient_code: recipientCode })
            .eq('id', bankAccountId);
        }
      } catch (error: any) {
        console.error('Failed to create Paystack recipient:', error);
        throw new ValidationError('Failed to set up bank account for transfer. Please try again.');
      }
    }

    // Generate transaction reference
    const reference = generateTransactionReference('withdrawal');

    // Check for duplicate reference
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTransaction) {
      // Regenerate if duplicate (very unlikely)
      const reference = generateTransactionReference('withdrawal');
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        bank_account_id: bankAccountId,
        type: 'debit',
        category: 'withdrawal',
        amount: amount,
        fee: fee,
        total_amount: netAmount, // Net amount after fee
        net_amount: netAmount,
        currency: 'NGN',
        title: 'Withdrawal',
        description: narration || `Withdrawal to ${bankAccount.bank_name}`,
        reference: reference,
        status: 'pending',
        initiated_at: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        user_agent: req.headers.get('user-agent') || undefined,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Lock balance (atomic update)
    const { error: balanceError } = await supabase
      .from('wallets')
      .update({
        available_balance: (availableBalance - totalAmount).toFixed(2),
        locked_balance: (parseFloat(wallet.locked_balance || 0) + totalAmount).toFixed(2),
      })
      .eq('id', wallet.id)
      .eq('available_balance', wallet.available_balance); // Optimistic locking

    if (balanceError) {
      // Rollback transaction
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);
      throw new ValidationError('Failed to update balance. Please try again.');
    }

    // Initiate Paystack transfer
    try {
      const transfer = await initiateTransfer(
        recipientCode!,
        toKobo(netAmount), // Transfer net amount (after fee) in kobo
        reference,
        narration || 'Wallet withdrawal'
      );

      // Update transaction with Paystack reference
      await supabase
        .from('transactions')
        .update({
          payment_gateway: 'paystack',
          gateway_reference: transfer.data?.reference || null,
          paystack_reference: transfer.data?.reference || null,
          paystack_status: transfer.data?.status || null,
          transfer_code: transfer.data?.transfer_code || null,
          status: 'processing',
        })
        .eq('id', transaction.id);

      // Log wallet activity
      await logWalletActivity({
        wallet_id: wallet.id,
        user_id: user.id,
        action: 'withdrawal_initiated',
        previous_balance: availableBalance,
        new_balance: availableBalance - totalAmount,
        amount_changed: -totalAmount,
        transaction_id: transaction.id,
        description: `Withdrawal of ${amount} NGN to ${bankAccount.bank_name}`,
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
            status: 'processing',
            account_name: bankAccount.account_name,
            bank_name: bankAccount.bank_name,
          },
          wallet: {
            balance: availableBalance - totalAmount,
            locked_balance: parseFloat(wallet.locked_balance || 0) + totalAmount,
          },
        },
        message: 'Withdrawal initiated successfully',
      });
    } catch (paystackError: any) {
      // Rollback balance lock
      await supabase
        .from('wallets')
        .update({
          available_balance: availableBalance.toFixed(2),
          locked_balance: (parseFloat(wallet.locked_balance || 0)).toFixed(2),
        })
        .eq('id', wallet.id);

      // Update transaction status
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          paystack_status: 'failed',
        })
        .eq('id', transaction.id);

      throw new ValidationError(
        paystackError.message || 'Failed to initiate transfer. Please try again.'
      );
    }
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
