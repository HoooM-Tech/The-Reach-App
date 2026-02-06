import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();

    // Get total count
    const { count: totalCount } = await adminSupabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    // Get total volume (sum of all successful transactions)
    const { data: successfulTransactions } = await adminSupabase
      .from('transactions')
      .select('amount')
      .eq('status', 'successful');

    const totalVolume = successfulTransactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    // Get pending count
    const { count: pendingCount } = await adminSupabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get failed count
    const { count: failedCount } = await adminSupabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    return NextResponse.json({
      total: totalCount || 0,
      totalVolume,
      pending: pendingCount || 0,
      failed: failedCount || 0,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
