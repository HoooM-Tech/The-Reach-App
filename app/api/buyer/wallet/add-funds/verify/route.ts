import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireBuyer } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import { verifyPayment } from '@/lib/services/paystack';

/**
 * POST /api/buyer/wallet/add-funds/verify
 * Verify Paystack payment and credit buyer wallet
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireBuyer();
    const { reference } = await req.json();

    if (!reference) throw new ValidationError('Reference is required');

    const supabase = createAdminSupabaseClient();

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('id, wallet_id, amount, status')
      .eq('reference', reference)
      .eq('user_id', user.id)
      .eq('category', 'deposit')
      .maybeSingle();

    if (txError || !transaction) throw new ValidationError('Transaction not found');

    if (transaction.status === 'successful' || transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: { transaction: { ...transaction, status: transaction.status } },
        message: 'Payment already verified',
      });
    }

    const paystackResponse = await verifyPayment(reference);

    if (!paystackResponse.status || paystackResponse.data?.status !== 'success') {
      await supabase
        .from('transactions')
        .update({ status: 'failed', failed_at: new Date().toISOString() })
        .eq('id', transaction.id);
      throw new ValidationError('Payment verification failed');
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, available_balance')
      .eq('id', transaction.wallet_id)
      .single();

    if (walletError || !wallet) throw new ValidationError('Wallet not found');

    const amount = parseFloat(transaction.amount || 0);
    const newAvailable = parseFloat(wallet.available_balance || 0) + amount;

    await supabase
      .from('wallets')
      .update({ available_balance: newAvailable.toFixed(2) })
      .eq('id', wallet.id);

    await supabase
      .from('transactions')
      .update({
        status: 'successful',
        completed_at: new Date().toISOString(),
        paystack_status: paystackResponse.data?.status || 'success',
      })
      .eq('id', transaction.id);

    return NextResponse.json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          reference,
          amount,
          status: 'successful',
          completed_at: new Date().toISOString(),
        },
      },
      message: 'Payment verified and wallet credited',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
