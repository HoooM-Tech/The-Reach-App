import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const resolvedParams = await Promise.resolve(params);
    const withdrawalId = resolvedParams.id;
    const body = await req.json();

    if (!body.reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await adminSupabase
      .from('payouts')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    // Update withdrawal status
    const { error: updateError } = await adminSupabase
      .from('payouts')
      .update({
        status: 'cancelled',
        failure_reason: body.reason,
        processed_by: admin.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    if (updateError) {
      throw updateError;
    }

    // Refund amount back to wallet
    const { data: wallet } = await adminSupabase
      .from('wallets')
      .select('*')
      .eq('user_id', withdrawal.user_id)
      .single();

    if (wallet) {
      await adminSupabase
        .from('wallets')
        .update({
          available_balance: (Number(wallet.available_balance) + Number(withdrawal.net_amount)).toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);
    }

    // Log admin action
    await adminSupabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'withdrawal_rejected',
      entity: 'payout',
      entity_id: withdrawalId,
      details: { 
        reason: body.reason,
        amount: withdrawal.net_amount,
        user_id: withdrawal.user_id,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

    // TODO: Send notification to user

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
