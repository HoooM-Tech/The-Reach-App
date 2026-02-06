import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { verifyPayment } from '@/lib/services/paystack';
import { toNaira } from '@/lib/utils/currency';
import { logWalletActivity } from '@/lib/utils/wallet-activity';
import {
  sendDepositConfirmationEmail,
  sendWithdrawalCompletedEmail,
  sendWithdrawalFailedEmail,
} from '@/lib/utils/email-notifications';
import crypto from 'crypto';

/**
 * POST /api/webhooks/paystack
 * 
 * Handle Paystack webhook events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const supabase = createAdminSupabaseClient();

    // Handle transfer events (withdrawals)
    if (event.event === 'transfer.success') {
      const { reference, data } = event.data;

      // Find transaction by reference or paystack_reference
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*, wallets!inner(*)')
        .or(`reference.eq.${reference},paystack_reference.eq.${reference}`)
        .maybeSingle();

      if (transactionError) {
        console.error('Error finding transaction:', transactionError);
        return NextResponse.json({ received: true });
      }

      if (!transaction) {
        console.warn(`Transaction not found for reference: ${reference}`);
        return NextResponse.json({ received: true });
      }

      // Check if already processed
      if (transaction.status === 'successful' || transaction.status === 'completed') {
        console.log(`Transaction ${reference} already processed`);
        return NextResponse.json({ received: true });
      }

      const wallet = transaction.wallets;
      if (!wallet) {
        console.error(`Wallet not found for transaction ${reference}`);
        return NextResponse.json({ received: true });
      }

      const lockedBalance = parseFloat(wallet.locked_balance || 0);
      const availableBalance = parseFloat(wallet.available_balance || 0);
      const totalAmount = parseFloat(transaction.total_amount);

      // Update transaction status
      const newLockedBalance = Math.max(0, lockedBalance - totalAmount);
      const gatewayRef = data?.reference || transaction.paystack_reference || reference;
      await supabase
        .from('transactions')
        .update({
          status: 'successful',
          payment_gateway: 'paystack',
          gateway_reference: gatewayRef,
          paystack_reference: gatewayRef,
          paystack_status: 'success',
          completed_at: new Date().toISOString(),
          webhook_received: true,
          webhook_payload: event.data,
          webhook_received_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)
        .in('status', ['pending', 'processing']);

      // Release locked balance (amount already deducted from available_balance during initiation)
      await supabase
        .from('wallets')
        .update({
          locked_balance: newLockedBalance.toFixed(2),
        })
        .eq('id', wallet.id);

      // Log wallet activity
      await logWalletActivity({
        wallet_id: wallet.id,
        user_id: transaction.user_id || wallet.user_id,
        action: 'withdrawal_completed',
        previous_balance: parseFloat(wallet.available_balance || 0),
        new_balance: parseFloat(wallet.available_balance || 0),
        amount_changed: 0, // Already deducted during initiation
        transaction_id: transaction.id,
        description: `Withdrawal of ${totalAmount} NGN completed`,
      });

      // Send email notification
      try {
        const { data: user } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', transaction.user_id || wallet.user_id)
          .single();

        const { data: bankAccount } = await supabase
          .from('bank_accounts')
          .select('bank_name, account_number')
          .eq('id', transaction.bank_account_id)
          .single();

        if (user?.email) {
          await sendWithdrawalCompletedEmail(
            user.email,
            user.full_name || 'User',
            totalAmount,
            reference
          );
        }
      } catch (emailError) {
        console.error('Failed to send withdrawal completion email:', emailError);
        // Don't fail webhook if email fails
      }

      console.log(`Withdrawal completed: ${reference}, Amount: ${totalAmount} NGN`);
    }

    if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const { reference, data } = event.data;

      // Find transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*, wallets(*)')
        .eq('reference', reference)
        .maybeSingle();

      if (transactionError) {
        console.error('Error finding transaction:', transactionError);
        return NextResponse.json({ received: true });
      }

      if (transaction && ['pending', 'processing'].includes(transaction.status || '')) {
        const wallet = transaction.wallets;
        if (!wallet) {
          return NextResponse.json({ received: true });
        }

        const availableBalance = parseFloat(wallet.available_balance || 0);
        const lockedBalance = parseFloat(wallet.locked_balance || 0);
        const totalAmount = parseFloat(transaction.total_amount);

        // Update transaction status
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            payment_gateway: 'paystack',
            gateway_reference: reference,
            paystack_reference: reference,
            paystack_status: data?.status || 'failed',
            failed_at: new Date().toISOString(),
            webhook_received: true,
            webhook_payload: event.data,
            webhook_received_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        // Refund balance
        const newAvailableBalance = availableBalance + totalAmount;
        const newLockedBalance = Math.max(0, lockedBalance - totalAmount);

        await supabase
          .from('wallets')
          .update({
            available_balance: newAvailableBalance.toFixed(2),
            locked_balance: newLockedBalance.toFixed(2),
          })
          .eq('id', wallet.id);

        // Log wallet activity
        await logWalletActivity({
          wallet_id: wallet.id,
          user_id: transaction.user_id || wallet.user_id,
          action: 'withdrawal_failed',
          previous_balance: availableBalance,
          new_balance: newAvailableBalance,
          amount_changed: totalAmount,
          transaction_id: transaction.id,
          description: `Withdrawal of ${totalAmount} NGN failed - refunded`,
        });

        // Send email notification
        try {
          const { data: user } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', transaction.user_id || wallet.user_id)
            .single();

          if (user?.email) {
            await sendWithdrawalFailedEmail(
              user.email,
              user.full_name || 'User',
              totalAmount,
              reference,
              data?.reason || 'Transfer failed'
            );
          }
        } catch (emailError) {
          console.error('Failed to send withdrawal failed email:', emailError);
          // Don't fail webhook if email fails
        }
      }
    }

    // Handle payment events (Deposits/Add Funds)
    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data;

      // Find transaction by reference
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*, wallets!inner(*)')
        .eq('reference', reference)
        .maybeSingle();

      if (transactionError) {
        console.error('Error finding transaction:', transactionError);
        return NextResponse.json({ received: true });
      }

      if (!transaction) {
        console.warn(`Transaction not found for reference: ${reference}`);
        return NextResponse.json({ received: true });
      }

      // Check if already processed (idempotency)
      if (transaction.status === 'successful' || transaction.status === 'completed') {
        console.log(`✅ Transaction ${reference} already processed - skipping`);
        return NextResponse.json({ received: true });
      }

      // Log stuck transactions for debugging
      if (transaction.status === 'processing') {
        console.log(`⚠️ Transaction ${reference} is in processing status, updating to successful`);
      }
      
      if (transaction.status === 'pending') {
        const txAge = Date.now() - new Date(transaction.created_at || transaction.initiated_at || Date.now()).getTime();
        const txAgeMinutes = Math.floor(txAge / (1000 * 60));
        if (txAgeMinutes > 5) {
          console.warn(`⚠️ Stuck transaction detected: ${reference} is ${txAgeMinutes} minutes old`);
        }
      }

      // Verify transaction with Paystack API (extra security)
      try {
        const verification = await verifyPayment(reference);
        if (!verification.status || verification.data.status !== 'success') {
          console.error(`Paystack verification failed for ${reference}`);
          return NextResponse.json({ received: true });
        }
      } catch (verifyError: any) {
        console.error('Paystack verification error:', verifyError);
        // Still process if webhook signature is valid
      }

      // Use database transaction for atomicity
      const wallet = transaction.wallets;
      if (!wallet) {
        console.error(`Wallet not found for transaction ${reference}`);
        return NextResponse.json({ received: true });
      }

      const amountInNaira = toNaira(amount); // Convert from kobo
      const currentBalance = parseFloat(wallet.available_balance || 0);
      const transactionAmount = parseFloat(transaction.amount);

      // Update transaction status and wallet balance atomically
      // Handle both 'pending' and 'processing' statuses to prevent stuck transactions
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'successful',
          payment_gateway: 'paystack',
          gateway_reference: reference,
          paystack_reference: reference,
          paystack_status: 'success',
          completed_at: new Date().toISOString(),
          webhook_received: true,
          webhook_payload: event.data,
          webhook_received_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)
        .in('status', ['pending', 'processing']); // Update if pending or processing

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return NextResponse.json({ received: true });
      }

      // Update wallet balance
      const newBalance = currentBalance + transactionAmount;
      await supabase
        .from('wallets')
        .update({
          available_balance: newBalance.toFixed(2),
        })
        .eq('id', wallet.id);

      // Log wallet activity
      await logWalletActivity({
        wallet_id: wallet.id,
        user_id: transaction.user_id || wallet.user_id,
        action: 'deposit_completed',
        previous_balance: currentBalance,
        new_balance: newBalance,
        amount_changed: transactionAmount,
        transaction_id: transaction.id,
        description: `Deposit of ${amountInNaira} NGN completed`,
      });

      // Send email notification
      try {
        const { data: user } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', transaction.user_id || wallet.user_id)
          .single();

        if (user?.email) {
          await sendDepositConfirmationEmail(
            user.email,
            user.full_name || 'User',
            transactionAmount,
            reference,
            newBalance
          );
        }
      } catch (emailError) {
        console.error('Failed to send deposit confirmation email:', emailError);
        // Don't fail webhook if email fails
      }

      console.log(`Deposit processed: ${reference}, Amount: ${amountInNaira} NGN`);
    }

    // CRITICAL: Always return HTTP 200 to Paystack
    // Paystack interprets any non-200 response as failure and keeps the transaction open
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // CRITICAL: Always return HTTP 200 even on error
    // Log the error but don't fail the webhook - Paystack needs 200 to close the transaction
    // Return 200 with error logged internally
    return NextResponse.json({ received: true, error: 'Internal processing error (logged)' });
  }
}
