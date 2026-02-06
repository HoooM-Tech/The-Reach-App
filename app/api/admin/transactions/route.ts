import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const userType = searchParams.get('userType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    // Build query with joins
    let query = adminSupabase
      .from('transactions')
      .select(`
        *,
        wallets!inner(
          user_id,
          users!inner(
            full_name,
            email,
            role
          )
        )
      `, { count: 'exact' });

    // Filter by type
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by user type
    if (userType && userType !== 'all') {
      query = query.eq('wallets.users.role', userType);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: transactions, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data
    const transformedTransactions = (transactions || []).map((tx: any) => ({
      id: tx.id,
      reference: tx.reference,
      type: tx.type,
      category: tx.category,
      amount: Number(tx.amount),
      fee: Number(tx.fee || 0),
      total_amount: Number(tx.total_amount),
      status: tx.status,
      title: tx.title,
      description: tx.description,
      created_at: tx.created_at,
      user: tx.wallets?.users ? {
        full_name: tx.wallets.users.full_name,
        email: tx.wallets.users.email,
        role: tx.wallets.users.role,
      } : null,
    }));

    return NextResponse.json({
      transactions: transformedTransactions,
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
