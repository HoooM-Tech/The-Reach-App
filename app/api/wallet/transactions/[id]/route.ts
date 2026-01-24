import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, NotFoundError } from '@/lib/utils/errors';

/**
 * GET /api/wallet/transactions/[id]
 * 
 * Get transaction details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: transactionId } = await Promise.resolve(params);
    const supabase = createAdminSupabaseClient();

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    // Get transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*, bank_accounts(*)')
      .eq('id', transactionId)
      .eq('wallet_id', wallet.id)
      .maybeSingle();

    if (transactionError) throw transactionError;
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    // Build timeline
    const timeline = [];
    if (transaction.initiated_at) {
      timeline.push({
        status: 'pending',
        timestamp: transaction.initiated_at,
      });
    }
    if (transaction.status === 'processing' && transaction.updated_at) {
      timeline.push({
        status: 'processing',
        timestamp: transaction.updated_at,
      });
    }
    if (transaction.completed_at) {
      timeline.push({
        status: 'completed',
        timestamp: transaction.completed_at,
      });
    }
    if (transaction.failed_at) {
      timeline.push({
        status: 'failed',
        timestamp: transaction.failed_at,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: transaction.id,
        type: transaction.type,
        category: transaction.category,
        amount: parseFloat(transaction.amount || 0),
        fee: parseFloat(transaction.fee || 0),
        net_amount: parseFloat(transaction.net_amount || transaction.total_amount || 0),
        total_amount: parseFloat(transaction.total_amount || 0),
        status: transaction.status,
        reference: transaction.reference,
        gateway_reference: transaction.gateway_reference || transaction.paystack_reference,
        payment_gateway: transaction.payment_gateway || 'paystack',
        bank_account: transaction.bank_accounts ? {
          bank_name: transaction.bank_accounts.bank_name,
          account_number: transaction.bank_accounts.account_number,
          account_name: transaction.bank_accounts.account_name,
        } : null,
        title: transaction.title,
        description: transaction.description,
        created_at: transaction.created_at,
        initiated_at: transaction.initiated_at,
        completed_at: transaction.completed_at,
        failed_at: transaction.failed_at,
        timeline,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
