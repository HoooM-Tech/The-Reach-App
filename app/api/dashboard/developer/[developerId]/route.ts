import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { developerId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const developerId = params.developerId

    // Verify access
    if (currentUser.id !== developerId && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient() // Use admin client to bypass RLS for leads/inspections

    // Get properties summary
    const { data: properties } = await supabase
      .from('properties')
      .select('id, verification_status, status')
      .eq('developer_id', developerId)

    const propertiesSummary = {
      total: properties?.length || 0,
      verified: properties?.filter((p) => p.verification_status === 'verified').length || 0,
      pending: properties?.filter((p) => p.verification_status === 'pending_verification').length || 0,
      draft: properties?.filter((p) => p.status === 'draft').length || 0,
    }

    const propertyIds = properties?.map((p) => p.id) || []

    // Get leads - use admin client to bypass RLS (leads can be created by anonymous users)
    const { data: leads } = await adminSupabase
      .from('leads')
      .select('*, properties(id, title)')
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })

    const leadsByProperty = leads?.reduce((acc: any, lead: any) => {
      const propId = lead.property_id
      if (!acc[propId]) {
        acc[propId] = { property_id: propId, property_title: lead.properties?.title, count: 0 }
      }
      acc[propId].count++
      return acc
    }, {}) || {}

    // Get inspections - use admin client to bypass RLS (inspections can be booked by anonymous users)
    // Order by created_at descending to show most recently booked first
    const { data: inspections } = await adminSupabase
      .from('inspections')
      .select('*, properties(id, title), leads(buyer_name, buyer_phone, buyer_email)')
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })

    // Separate upcoming inspections (future slot_time) and sort them by slot_time for display
    const now = new Date()
    const upcomingInspections = inspections?.filter(
      (i) => new Date(i.slot_time) > now
    ).sort((a, b) => new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime()) || []
    
    // Most recently booked inspections (by created_at)
    const recentlyBookedInspections = inspections?.slice(0, 10) || []

    // Get payments
    const { data: escrowTransactions } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('developer_id', developerId)

    const totalRevenue = escrowTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
    const pendingEscrow = escrowTransactions
      ?.filter((t) => t.status === 'held')
      .reduce((sum, t) => sum + (t.amount || 0), 0) || 0

    return NextResponse.json({
      properties: propertiesSummary,
      leads: {
        total: leads?.length || 0,
        by_property: Object.values(leadsByProperty),
        recent: leads?.slice(0, 10) || [],
      },
      inspections: {
        total_booked: inspections?.length || 0,
        upcoming: upcomingInspections.slice(0, 10),
        recently_booked: recentlyBookedInspections,
        completed: inspections?.filter((i) => i.status === 'completed').length || 0,
      },
      payments: {
        total_revenue: totalRevenue,
        pending_escrow: pendingEscrow,
        paid_out: totalRevenue - pendingEscrow,
        transactions: escrowTransactions?.slice(0, 10) || [],
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

