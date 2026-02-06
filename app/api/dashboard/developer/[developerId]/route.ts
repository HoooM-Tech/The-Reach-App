import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
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

    // Calculate date 30 days ago for comparison
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    // Get properties summary (current) - Use adminSupabase to ensure we get all properties
    const { data: properties, error: propertiesError } = await adminSupabase
      .from('properties')
      .select('id, verification_status, status, created_at')
      .eq('developer_id', developerId)

    if (propertiesError) {
      console.error('[Dashboard API] Error fetching properties:', propertiesError)
    }

    // Debug: Log all verification_status values to help diagnose issues
    if (properties && properties.length > 0) {
      const statusCounts = properties.reduce((acc: Record<string, number>, p: any) => {
        const status = p.verification_status || 'null'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      console.log(`[Dashboard API] Developer ${developerId} properties status counts:`, statusCounts)
      
      // Log individual properties for debugging
      properties.forEach((p: any) => {
        console.log(`[Dashboard API] Property ${p.id}: verification_status="${p.verification_status}", status="${p.status}"`)
      })
    }
    
    // Log pending count calculation
    console.log(`[Dashboard API] Calculating pending verification count...`)

    // Get properties from 30 days ago for comparison - Use adminSupabase to ensure we get all properties
    const { data: previousProperties } = await adminSupabase
      .from('properties')
      .select('id, verification_status, status')
      .eq('developer_id', developerId)
      .lt('created_at', thirtyDaysAgoISO)

    // Calculate current counts
    const currentTotal = properties?.length || 0
    const currentVerified = properties?.filter((p) => p.verification_status === 'verified').length || 0
    const currentActive = properties?.filter((p) => p.verification_status === 'verified' || p.status === 'active').length || 0
    
    // Pending verification: includes 'pending_verification', 'submitted', and 'pending' (case-insensitive)
    const pendingProperties = properties?.filter((p) => {
      const status = (p.verification_status || '').toLowerCase().trim()
      const isPending = status === 'pending_verification' || 
                       status === 'submitted' || 
                       status === 'pending'
      if (isPending) {
        console.log(`[Dashboard API] Found pending property ${p.id} with verification_status="${p.verification_status}"`)
      }
      return isPending
    }) || []
    const currentPending = pendingProperties.length
    console.log(`[Dashboard API] Total pending verification count: ${currentPending}`)

    // Calculate previous counts
    const previousTotal = previousProperties?.length || 0
    const previousVerified = previousProperties?.filter((p) => p.verification_status === 'verified').length || 0
    const previousActive = previousProperties?.filter((p) => p.verification_status === 'verified' || p.status === 'active').length || 0
    
    // Pending verification: includes 'pending_verification', 'submitted', and 'pending' (case-insensitive)
    const previousPending = previousProperties?.filter((p) => {
      const status = (p.verification_status || '').toLowerCase().trim()
      return status === 'pending_verification' || 
             status === 'submitted' || 
             status === 'pending'
    }).length || 0

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    const propertiesSummary = {
      total: currentTotal,
      verified: currentVerified,
      active: currentActive,
      pending: currentPending,
      draft: properties?.filter((p) => p.status === 'draft').length || 0,
      changes: {
        total: calculateChange(currentTotal, previousTotal),
        active: calculateChange(currentActive, previousActive),
        pending: calculateChange(currentPending, previousPending),
      }
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

    // Calculate previous leads count (from 30 days ago)
    let previousLeadsCount = 0
    if (propertyIds.length > 0) {
      const previousPropertyIds = previousProperties?.map((p) => p.id) || []
      if (previousPropertyIds.length > 0) {
        const { data: previousLeads } = await adminSupabase
          .from('leads')
          .select('id')
          .in('property_id', previousPropertyIds)
          .lt('created_at', thirtyDaysAgoISO)
        
        previousLeadsCount = previousLeads?.length || 0
      }
    }

    // Calculate leads change percentage
    const leadsChange = calculateChange(totalLeadsCount, previousLeadsCount)

    // Count booked inspections (upcoming or confirmed)
    const bookedInspectionsCount = upcomingInspections.filter(
      (i) => i.status === 'booked' || i.status === 'confirmed'
    ).length

    return NextResponse.json({
      properties: propertiesSummary,
      leads: {
        total: totalLeadsCount,
        change: leadsChange,
        by_property: Object.values(leadsByProperty),
        recent: recentLeads || [],
      },
      inspections: {
        total_booked: bookedInspectionsCount,
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

