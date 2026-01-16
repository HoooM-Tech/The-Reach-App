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

    // Initialize leadsByProperty with all properties (ensures properties with 0 leads are included)
    // Get property titles from properties query for accurate display
    const propertyTitles: Record<string, string> = {}
    properties?.forEach((prop) => {
      propertyTitles[prop.id] = '' // Will be filled from properties query
    })

    // Get full property data to populate titles
    const { data: fullProperties } = await supabase
      .from('properties')
      .select('id, title')
      .eq('developer_id', developerId)

    fullProperties?.forEach((prop: any) => {
      if (propertyTitles[prop.id] !== undefined) {
        propertyTitles[prop.id] = prop.title || ''
      }
    })

    const leadsByProperty: Record<string, { property_id: string; property_title: string; count: number }> = {}
    properties?.forEach((prop) => {
      leadsByProperty[prop.id] = {
        property_id: prop.id,
        property_title: propertyTitles[prop.id] || '',
        count: 0,
      }
    })

    // Get leads - use admin client to bypass RLS (leads can be created by anonymous users)
    // Count leads per property using database aggregation (database is source of truth)
    let recentLeads: any[] = []
    
    if (propertyIds.length > 0) {
      // Get all leads to count per property
      const { data: leads, error: leadsError } = await adminSupabase
        .from('leads')
        .select('property_id')
        .in('property_id', propertyIds)

      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
      } else if (leads) {
        // Count leads per property (database is source of truth)
        leads.forEach((lead: any) => {
          const propId = lead.property_id
          if (leadsByProperty[propId]) {
            leadsByProperty[propId].count++
          }
        })
      }

      // Get recent leads for display (limit to 10) with full details
      const { data: recentLeadsData } = await adminSupabase
        .from('leads')
        .select('*, properties(id, title)')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false })
        .limit(10)

      recentLeads = recentLeadsData || []
    }

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

    // Calculate total leads count from database (source of truth)
    const totalLeadsCount = Object.values(leadsByProperty).reduce(
      (sum, prop) => sum + prop.count,
      0
    )

    return NextResponse.json({
      properties: propertiesSummary,
      leads: {
        total: totalLeadsCount,
        by_property: Object.values(leadsByProperty),
        recent: recentLeads || [],
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

