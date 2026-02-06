import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams.id;

    // Get user
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get additional data based on role
    let additionalData: any = {};

    if (user.role === 'developer') {
      const { data: properties } = await adminSupabase
        .from('properties')
        .select('id, title, verification_status, status')
        .eq('developer_id', userId);
      additionalData.properties = properties || [];
    }

    // Get wallet if exists
    const { data: wallet } = await adminSupabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    additionalData.wallet = wallet;

    // Get recent transactions
    const { data: transactions } = await adminSupabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', wallet?.id || '')
      .order('created_at', { ascending: false })
      .limit(10);
    additionalData.transactions = transactions || [];

    return NextResponse.json({
      user: {
        ...user,
        ...additionalData,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
