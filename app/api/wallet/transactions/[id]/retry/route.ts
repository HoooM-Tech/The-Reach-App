import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';
import { initiateTransfer } from '@/lib/services/paystack';
import { toKobo } from '@/lib/utils/currency';
import { generateTransactionReference } from '@/lib/utils/transaction-reference';
import { WalletErrorCode, createWalletError } from '@/lib/utils/wallet-errors';

/**
 * POST /api/wallet/transactions/[id]/retry
 * 
 * Retry a failed withdrawal transaction
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: transactionId } = await Promise.resolve(params);
    const supabase = createAdminSupabaseClient();

    // Get original transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*, wallets!inner(*), bank_accounts(*)')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (transactionError || !transaction) {
      throw new NotFoundError('Transaction');
    }

    if (transaction.status !== 'failed') {
      throw new ValidationError('Only failed transactions can be retried');
    }

    if (transaction.category !== 'withdrawal') {
      throw new ValidationError('Only withdrawal transactions can be retried');
    }

    const wallet = transaction.wallets;
    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    // Check if withdrawal is still valid
    const availableBalance = parseFloat(wallet.available_balance || 0);
    const transactionAmount = parseFloat(transaction.amount || 0);
    const transactionFee = parseFloat(transaction.fee || 0);
    const totalAmount = transactionAmount + transactionFee;

    if (availableBalance < totalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: createWalletError(
            WalletErrorCode.INSUFFICIENT_BALANCE,
            'Insufficient balance to retry withdrawal',
            {
              required: totalAmount,
              available: availableBalance,
            }
          ),
        },
        { status: 400 }
      );
    }

    const bankAccount = transaction.bank_accounts;
    if (!bankAccount || !bankAccount.recipient_code) {
      throw new ValidationError('Bank account recipient code not found');
    }

    // Create new transaction with same details
    const newReference = generateTransactionReference('withdrawal');
    const { data: newTransaction, error: createError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        bank_account_id: transaction.bank_account_id,
        type: 'debit',
        category: 'withdrawal',
        amount: transactionAmount,
        fee: transactionFee,
        total_amount: transaction.total_amount,
        net_amount: transaction.net_amount || transaction.total_amount,
        currency: transaction.currency || 'NGN',
        title: transaction.title,
        description: `Retry: ${transaction.description || 'Withdrawal'}`,
        reference: newReference,
        status: 'pending',
        initiated_at: new Date().toISOString(),
        metadata: {
          retry_of: transaction.id,
          retry_count: (transaction.metadata?.retry_count || 0) + 1,
        },
      })
      .select()
      .single();

    if (createError) throw createError;

    // Lock balance
    const newAvailableBalance = availableBalance - totalAmount;
    const newLockedBalance = parseFloat(wallet.locked_balance || 0) + totalAmount;

    await supabase
      .from('wallets')
      .update({
        available_balance: newAvailableBalance.toFixed(2),
        locked_balance: newLockedBalance.toFixed(2),
      })
      .eq('id', wallet.id);

    // Initiate Paystack transfer
    try {
      const transfer = await initiateTransfer(
        bankAccount.recipient_code,
        toKobo(parseFloat(transaction.total_amount || transactionAmount)),
        newReference,
        `Retry: ${transaction.description || 'Wallet withdrawal'}`
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
        .eq('id', newTransaction.id);

      return NextResponse.json({
        success: true,
        data: {
          transaction: {
            id: newTransaction.id,
            reference: newTransaction.reference,
            amount: parseFloat(newTransaction.amount),
            fee: parseFloat(newTransaction.fee),
            status: 'processing',
          },
        },
        message: 'Withdrawal retry initiated successfully',
      });
    } catch (paystackError: any) {
      // Rollback balance lock
      await supabase
        .from('wallets')
        .update({
          available_balance: availableBalance.toFixed(2),
          locked_balance: parseFloat(wallet.locked_balance || 0).toFixed(2),
        })
        .eq('id', wallet.id);

      // Update transaction status
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          paystack_status: 'failed',
        })
        .eq('id', newTransaction.id);

      throw new ValidationError(
        paystackError.message || 'Failed to retry withdrawal'
      );
    }
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
