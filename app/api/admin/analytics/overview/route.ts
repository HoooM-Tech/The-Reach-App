import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createServerSupabaseClient()

    // Get user counts
    const { data: users, count: userCount } = await supabase
      .from('users')
      .select('role', { count: 'exact' })

    const userStats = {
      total: userCount || 0,
      developers: users?.filter((u) => u.role === 'developer').length || 0,
      creators: users?.filter((u) => u.role === 'creator').length || 0,
      buyers: users?.filter((u) => u.role === 'buyer').length || 0,
      active_today: 0, // Would need to track login activity
    }

    // Get property counts
    const { data: properties, count: propertyCount } = await supabase
      .from('properties')
      .select('verification_status, status', { count: 'exact' })

    const propertyStats = {
      total: propertyCount || 0,
      verified: properties?.filter((p) => p.verification_status === 'verified').length || 0,
      pending_verification: properties?.filter((p) => p.verification_status === 'pending_verification').length || 0,
      rejected: properties?.filter((p) => p.verification_status === 'rejected').length || 0,
      sold: properties?.filter((p) => p.status === 'sold').length || 0,
    }

    // Get financial stats
    const { data: escrowTransactions } = await supabase
      .from('escrow_transactions')
      .select('amount, status, splits')

    const totalRevenue = escrowTransactions?.reduce((sum, t) => {
      const splits = t.splits as any
      return sum + (splits?.reach_amount || 0)
    }, 0) || 0

    const escrowHeld = escrowTransactions
      ?.filter((t) => t.status === 'held')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0

    const { data: payouts } = await supabase
      .from('payouts')
      .select('amount, status')

    const pendingPayouts = payouts
      ?.filter((p) => p.status === 'requested' || p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    const completedPayouts = payouts
      ?.filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Get activity stats
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0])

    const { count: inspectionsCount } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .gte('slot_time', new Date().toISOString().split('T')[0])

    const { count: salesCount } = await supabase
      .from('escrow_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'released')
      .gte('released_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString())

    return NextResponse.json({
      users: userStats,
      properties: propertyStats,
      financial: {
        total_revenue: totalRevenue,
        escrow_held: escrowHeld,
        pending_payouts: pendingPayouts,
        completed_payouts: completedPayouts,
      },
      activity: {
        leads_today: leadsCount || 0,
        inspections_today: inspectionsCount || 0,
        sales_this_month: salesCount || 0,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

