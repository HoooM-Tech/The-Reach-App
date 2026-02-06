import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();

    // Get user counts
    const { data: users, count: userCount } = await adminSupabase
      .from('users')
      .select('role', { count: 'exact' });

    const userStats = {
      total: userCount || 0,
      developers: users?.filter((u) => u.role === 'developer').length || 0,
      creators: users?.filter((u) => u.role === 'creator').length || 0,
      buyers: users?.filter((u) => u.role === 'buyer').length || 0,
      growth: 12, // TODO: Calculate actual growth from last month
    };

    // Get property counts
    const { data: properties, count: propertyCount } = await adminSupabase
      .from('properties')
      .select('verification_status, status', { count: 'exact' });

    const propertyStats = {
      total: propertyCount || 0,
      verified: properties?.filter((p) => p.verification_status === 'verified').length || 0,
      pending_verification: properties?.filter((p) => p.verification_status === 'pending_verification').length || 0,
      rejected: properties?.filter((p) => p.verification_status === 'rejected').length || 0,
      sold: properties?.filter((p) => p.status === 'sold').length || 0,
      growth: 8, // TODO: Calculate actual growth from last month
    };

    // Get financial stats
    const { data: escrowTransactions } = await adminSupabase
      .from('escrow_transactions')
      .select('amount, status, splits')
      .not('amount', 'is', null);

    const totalRevenue = escrowTransactions?.reduce((sum, t) => {
      const splits = t.splits as any;
      return sum + (splits?.reach_amount || 0);
    }, 0) || 0;

    const escrowHeld = escrowTransactions
      ?.filter((t) => t.status === 'held')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

    // Get payouts
    const { data: payouts } = await adminSupabase
      .from('payouts')
      .select('net_amount, status')
      .not('net_amount', 'is', null);

    const pendingPayouts = payouts
      ?.filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) || 0;

    const completedPayouts = payouts
      ?.filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) || 0;

    // Get activity stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: leadsCount } = await adminSupabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { count: inspectionsCount } = await adminSupabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .gte('slot_time', today.toISOString());

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const { count: salesCount } = await adminSupabase
      .from('escrow_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'released')
      .gte('released_at', lastMonth.toISOString());

    return NextResponse.json({
      users: userStats,
      properties: propertyStats,
      financial: {
        total_revenue: totalRevenue,
        escrow_held: escrowHeld,
        pending_payouts: pendingPayouts,
        completed_payouts: completedPayouts,
        growth: 23, // TODO: Calculate actual growth from last month
      },
      activity: {
        leads_today: leadsCount || 0,
        inspections_today: inspectionsCount || 0,
        sales_this_month: salesCount || 0,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
