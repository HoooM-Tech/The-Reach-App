import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';
import { formatNaira } from '@/lib/utils/currency';

/**
 * GET /api/wallet/transactions
 * 
 * Get wallet transactions with pagination and filters
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = createAdminSupabaseClient();

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const type = searchParams.get('type'); // 'deposit' | 'withdrawal' | 'credit' | 'debit' | 'all'
    const status = searchParams.get('status'); // 'pending' | 'completed' | 'failed' | 'all'
    const category = searchParams.get('category'); // 'commission' | 'withdrawal' | 'deposit' | 'all'
    const fromDate = searchParams.get('from_date') || searchParams.get('startDate');
    const toDate = searchParams.get('to_date') || searchParams.get('endDate');
    const search = searchParams.get('search'); // Search by reference

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
      return NextResponse.json({
        success: true,
        data: {
          transactions: [],
          pagination: {
            page: 1,
            limit: limit,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
          },
          summary: {
            total_deposits: 0,
            total_withdrawals: 0,
            total_fees: 0,
          },
        },
      });
    }

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('transactions')
      .select('*, bank_accounts(bank_name, account_number, account_name)', { count: 'exact' })
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by type
    if (type && type !== 'all') {
      if (type === 'deposit') {
        query = query.in('type', ['deposit', 'credit']).eq('category', 'deposit');
      } else if (type === 'withdrawal') {
        query = query.in('type', ['withdrawal', 'debit']).eq('category', 'withdrawal');
      } else {
        query = query.eq('type', type);
      }
    }

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'completed') {
        query = query.in('status', ['completed', 'successful']);
      } else {
        query = query.eq('status', status);
      }
    }

    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Date range filter
    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }

    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    // Search by reference
    if (search) {
      query = query.ilike('reference', `%${search}%`);
    }

    const { data: transactions, error: transactionsError, count } = await query;

    if (transactionsError) {
      console.error('[Transactions API] Query error:', transactionsError);
      throw transactionsError;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Debug logging
    console.log('[Transactions API] Query results:', {
      walletId: wallet.id,
      userId: user.id,
      transactionCount: transactions?.length || 0,
      total,
      limit,
      page,
    });

    // Calculate summaries
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('amount, fee, category, status')
      .eq('wallet_id', wallet.id);

    const summary = {
      total_deposits: 0,
      total_withdrawals: 0,
      total_fees: 0,
    };

    if (allTransactions) {
      allTransactions.forEach((t) => {
        const amount = parseFloat(t.amount || 0);
        const fee = parseFloat(t.fee || 0);

        if (t.category === 'deposit' && ['completed', 'successful'].includes(t.status || '')) {
          summary.total_deposits += amount;
        } else if (t.category === 'withdrawal' && ['completed', 'successful'].includes(t.status || '')) {
          summary.total_withdrawals += amount;
        }

        if (['completed', 'successful'].includes(t.status || '')) {
          summary.total_fees += fee;
        }
      });
    }

    // Format transactions
    const formattedTransactions = (transactions || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      amount: parseFloat(t.amount || 0),
      fee: parseFloat(t.fee || 0),
      net_amount: parseFloat(t.net_amount || t.total_amount || 0),
      status: t.status,
      reference: t.reference,
      paystack_reference: t.paystack_reference,
      title: t.title,
      description: t.description,
      bank_account: t.bank_accounts ? {
        bank_name: t.bank_accounts.bank_name,
        account_number: t.bank_accounts.account_number,
        account_name: t.bank_accounts.account_name,
      } : null,
      created_at: t.created_at,
      completed_at: t.completed_at,
      failed_at: t.failed_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
        summary: {
          total_deposits: summary.total_deposits,
          total_withdrawals: summary.total_withdrawals,
          total_fees: summary.total_fees,
        },
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
