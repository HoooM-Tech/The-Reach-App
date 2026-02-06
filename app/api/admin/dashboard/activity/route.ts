import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    const activities: any[] = [];

    // Get recent property submissions
    const { data: recentProperties } = await adminSupabase
      .from('properties')
      .select('id, title, developer_id, verification_status, created_at, users!properties_developer_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentProperties) {
      recentProperties.forEach((prop: any) => {
        const developer = prop.users;
        activities.push({
          id: `property-${prop.id}`,
          type: prop.verification_status === 'verified' ? 'property_verified' : 'property_submitted',
          description: prop.verification_status === 'verified'
            ? `${prop.title} verified`
            : `${developer?.full_name || developer?.email || 'Developer'} submitted ${prop.title} for verification`,
          timestamp: prop.created_at,
          status: prop.verification_status,
          user: developer?.full_name || developer?.email,
        });
      });
    }

    // Get recent user registrations
    const { data: recentUsers } = await adminSupabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentUsers) {
      recentUsers.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user_registered',
          description: `New ${user.role} registered: ${user.full_name || user.email}`,
          timestamp: user.created_at,
          user: user.full_name || user.email,
        });
      });
    }

    // Get recent withdrawals
    const { data: recentWithdrawals } = await adminSupabase
      .from('payouts')
      .select('id, net_amount, status, created_at, processed_at, users!payouts_user_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentWithdrawals) {
      recentWithdrawals.forEach((withdrawal: any) => {
        const user = withdrawal.users;
        if (withdrawal.status === 'completed' && withdrawal.processed_at) {
          activities.push({
            id: `withdrawal-${withdrawal.id}`,
            type: 'withdrawal_processed',
            description: `Withdrawal of ₦${Number(withdrawal.net_amount).toLocaleString()} approved for ${user?.full_name || user?.email || 'User'}`,
            timestamp: withdrawal.processed_at,
            status: 'completed',
            user: user?.full_name || user?.email,
          });
        }
      });
    }

    // Get recent disputes
    const { data: recentDisputes } = await adminSupabase
      .from('disputes')
      .select('id, title, status, resolved_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentDisputes) {
      recentDisputes.forEach((dispute) => {
        if (dispute.status === 'resolved' && dispute.resolved_at) {
          activities.push({
            id: `dispute-${dispute.id}`,
            type: 'dispute_resolved',
            description: `Dispute "${dispute.title}" resolved`,
            timestamp: dispute.resolved_at,
            status: 'resolved',
          });
        }
      });
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const paginatedActivities = activities.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      activities: paginatedActivities,
      total: activities.length,
      page,
      limit,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
