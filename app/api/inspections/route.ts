import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'
import { normalizeNigerianPhone } from '@/lib/utils/phone'

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser()

    if (currentUser.role !== 'buyer' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = (searchParams.get('status') || 'all').toLowerCase()
    const query = searchParams.get('q')?.trim().toLowerCase() || ''
    const typeFilter = searchParams.get('type')?.trim().toLowerCase()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12')))

    const adminSupabase = createAdminSupabaseClient()

    const { data: allLeads } = await adminSupabase
      .from('leads')
      .select('id, buyer_email, buyer_phone')
      .order('created_at', { ascending: false })

    const userEmail = currentUser.email?.toLowerCase()
    const userPhone = currentUser.phone
    let normalizedUserPhone: string | null = null
    if (userPhone) {
      try {
        normalizedUserPhone = normalizeNigerianPhone(userPhone)
      } catch {
        normalizedUserPhone = null
      }
    }

    const matchingLeadIds =
      allLeads
        ?.filter((lead: any) => {
          if (userEmail && lead.buyer_email?.toLowerCase() === userEmail) return true
          if (normalizedUserPhone && lead.buyer_phone) {
            try {
              const normalizedLeadPhone = normalizeNigerianPhone(lead.buyer_phone)
              return normalizedLeadPhone === normalizedUserPhone
            } catch {
              return false
            }
          }
          return false
        })
        .map((lead: any) => lead.id) || []

    const { data: inspectionsByBuyerId } = await adminSupabase
      .from('inspections')
      .select(
        '*, properties(id, title, location, asking_price, bedrooms, bathrooms, sqft, rating, review_count, property_media(url, order_index, media_type)), leads(buyer_name, buyer_email, buyer_phone)'
      )
      .eq('buyer_id', currentUser.id)
      .order('slot_time', { ascending: false })

    let inspectionsByLead: any[] = []
    if (matchingLeadIds.length > 0) {
      const { data: inspectionsData } = await adminSupabase
        .from('inspections')
        .select(
          '*, properties(id, title, location, asking_price, bedrooms, bathrooms, sqft, rating, review_count, property_media(url, order_index, media_type)), leads(buyer_name, buyer_email, buyer_phone)'
        )
        .in('lead_id', matchingLeadIds)
        .order('slot_time', { ascending: false })
      inspectionsByLead = (inspectionsData || []).filter((i: any) => !i.buyer_id || i.buyer_id !== currentUser.id)
    }

    const allInspections = [...(inspectionsByBuyerId || []), ...(inspectionsByLead || [])]
    const uniqueInspections = allInspections.filter(
      (inspection: any, index: number, self: any[]) =>
        self.findIndex((i: any) => i.id === inspection.id) === index
    )

    const searchedInspections = uniqueInspections.filter((inspection: any) => {
      const property = inspection.properties || {}
      const location = property.location || {}
      const searchable = [
        property.title,
        location.address,
        location.city,
        location.state,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (query && !searchable.includes(query)) return false
      if (typeFilter && inspection.type?.toLowerCase() !== typeFilter) return false
      return true
    })

    const derivedStatus = (inspection: any) => {
      const raw = (inspection.status || '').toLowerCase()
      if (raw === 'cancelled') return 'cancelled'
      if (raw === 'completed' || raw === 'withdrawn') return 'completed'
      return 'scheduled'
    }

    const counts = searchedInspections.reduce(
      (acc: any, inspection: any) => {
        const s = derivedStatus(inspection)
        acc.all += 1
        acc[s] += 1
        return acc
      },
      { all: 0, scheduled: 0, completed: 0, cancelled: 0 }
    )

    const filteredByStatus = searchedInspections.filter((inspection: any) => {
      if (status === 'all') return true
      return derivedStatus(inspection) === status
    })

    const total = filteredByStatus.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const end = start + limit
    const paginated = filteredByStatus.slice(start, end)

    return NextResponse.json({
      inspections: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      counts,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
