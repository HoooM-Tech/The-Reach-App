import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'
import { normalizePhoneNumber } from '@/lib/utils/phone'

export async function GET(
  req: NextRequest,
  { params }: { params: { buyerId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const buyerId = params.buyerId

    // Verify access
    if (currentUser.id !== buyerId && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient() // Use admin client to bypass RLS for leads/inspections

    // Fetch ALL leads and filter by matching phone/email
    // This handles all phone format variations by normalizing and comparing
    const { data: allLeads } = await adminSupabase
      .from('leads')
      .select('*, properties(*)')
      .order('created_at', { ascending: false })

    let leads: any[] = []
    const userEmail = currentUser.email?.toLowerCase()
    const userPhone = currentUser.phone
    const normalizedUserPhone = userPhone ? normalizePhoneNumber(userPhone) : null

    if (allLeads) {
      leads = allLeads.filter((lead: any) => {
        // Match by email (case-insensitive)
        if (userEmail && lead.buyer_email?.toLowerCase() === userEmail) {
          return true
        }
        
        // Match by phone (compare normalized versions)
        if (normalizedUserPhone && lead.buyer_phone) {
          const normalizedLeadPhone = normalizePhoneNumber(lead.buyer_phone)
          if (normalizedLeadPhone === normalizedUserPhone) {
            return true
          }
        }
        
        return false
      })
    }

    // Get unique properties from leads
    const viewedProperties = leads?.map((lead) => lead.properties).filter(Boolean) || []
    const uniqueViewedProperties = viewedProperties.filter((property: any, index: number, self: any[]) =>
      self.findIndex((p: any) => p?.id === property?.id) === index
    )

    // Get saved properties (if we had a saved_properties table, would query here)
    // For now, we'll use properties from leads as viewed
    const savedProperties: any[] = []

    // Get inspections - match by buyer_id OR by lead's buyer_phone/email
    // First, get inspections by buyer_id
    const { data: inspectionsByBuyerId } = await adminSupabase
      .from('inspections')
      .select('*, properties(id, title, location, asking_price), leads(*)')
      .eq('buyer_id', buyerId)
      .order('slot_time', { ascending: true })

    // Get lead IDs from the already-matched leads
    const matchingLeadIds = leads.map((lead: any) => lead.id)
    // Get inspections for those leads (excluding ones already matched by buyer_id)
    let inspectionsByLead: any[] = []
    if (matchingLeadIds.length > 0) {
      const { data: inspectionsData } = await adminSupabase
        .from('inspections')
        .select('*, properties(id, title, location, asking_price), leads(*)')
        .in('lead_id', matchingLeadIds)
        .order('slot_time', { ascending: true })
      inspectionsByLead = (inspectionsData || []).filter((i: any) =>
        !i.buyer_id || i.buyer_id !== buyerId // Exclude ones already matched by buyer_id
      )
    }

    // Combine both sets of inspections and remove duplicates
    const allInspections = [
      ...(inspectionsByBuyerId || []),
      ...(inspectionsByLead || [])
    ]
    const uniqueInspections = allInspections.filter((inspection: any, index: number, self: any[]) =>
      self.findIndex((i: any) => i.id === inspection.id) === index
    )

    // Filter into upcoming vs past
    const upcomingInspectionsUnsorted = uniqueInspections.filter(
      (i: any) => new Date(i.slot_time) > new Date() && i.status !== 'cancelled'
    ) || []

    const pastInspectionsUnsorted = uniqueInspections.filter(
      (i: any) => new Date(i.slot_time) <= new Date() || i.status === 'completed'
    ) || []

    // Sort by created_at descending so the most recently booked inspection shows first
    // This ensures rescheduled inspections take priority over old ones
    const upcomingInspections = upcomingInspectionsUnsorted.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA
    })

    const pastInspections = pastInspectionsUnsorted.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA
    })

    // Get payments/transactions
    const { data: escrowTransactions } = await supabase
      .from('escrow_transactions')
      .select('*, properties(id, title)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })

    const activeTransactions = escrowTransactions?.filter((t) => t.status === 'held') || []
    const completedTransactions = escrowTransactions?.filter((t) => t.status === 'released') || []

    // Get handovers
    const { data: handovers } = await supabase
      .from('handovers')
      .select('*, properties(id, title, location)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })

    const pendingHandovers = handovers?.filter((h) => h.status !== 'completed') || []
    const completedHandovers = handovers?.filter((h) => h.status === 'completed') || []

    // Get document vault
    const { data: documents } = await supabase
      .from('document_vault')
      .select('*')
      .eq('user_id', buyerId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      viewed_properties: uniqueViewedProperties,
      saved_properties: savedProperties,
      inspections: {
        upcoming: upcomingInspections,
        past: pastInspections,
      },
      payments: {
        active_transactions: activeTransactions,
        completed: completedTransactions,
      },
      handovers: {
        pending: pendingHandovers,
        completed: completedHandovers,
      },
      document_vault: documents || [],
      leads: leads || [], // Include leads for reference
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

