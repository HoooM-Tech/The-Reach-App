import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    let query = adminSupabase
      .from('payouts')
      .select(`
        *,
        users!payouts_user_id_fkey(full_name, email, role),
        bank_accounts!payouts_bank_account_id_fkey(bank_name, account_number, account_name)
      `, { count: 'exact' });

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: payouts, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data
    const transformedWithdrawals = (payouts || []).map((payout: any) => ({
      id: payout.id,
      user_id: payout.user_id,
      gross_amount: Number(payout.gross_amount || payout.amount || 0),
      platform_fee: Number(payout.platform_fee || 0),
      net_amount: Number(payout.net_amount || payout.amount || 0),
      status: payout.status,
      due_date: payout.due_date,
      created_at: payout.created_at,
      user: payout.users ? {
        full_name: payout.users.full_name,
        email: payout.users.email,
        role: payout.users.role,
      } : null,
      bank_account: payout.bank_accounts ? {
        bank_name: payout.bank_accounts.bank_name,
        account_number: payout.bank_accounts.account_number,
        account_name: payout.bank_accounts.account_name,
      } : null,
    }));

    return NextResponse.json({
      withdrawals: transformedWithdrawals,
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
