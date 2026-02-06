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

    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await adminSupabase
      .from('payouts')
      .select('*, users!payouts_user_id_fkey(*), bank_accounts!payouts_bank_account_id_fkey(*)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Withdrawal is not pending' }, { status: 400 });
    }

    // Update withdrawal status to processing
    const { error: updateError } = await adminSupabase
      .from('payouts')
      .update({
        status: 'processing',
        processed_by: admin.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalId);

    if (updateError) {
      throw updateError;
    }

    // TODO: Initiate Paystack transfer here
    // For now, we'll mark it as completed after processing
    // In production, you'd call Paystack API and update status based on response

    // Log admin action
    await adminSupabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'withdrawal_approved',
      entity: 'payout',
      entity_id: withdrawalId,
      details: { 
        amount: withdrawal.net_amount,
        user_id: withdrawal.user_id,
      },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

    // TODO: Send notification to user
    // TODO: Update wallet balance

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
