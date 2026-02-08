import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

/**
 * Map database handover status to buyer-facing UI status
 */
function deriveUIStatus(handover: any): string {
  const raw = (handover.status || '').toLowerCase()
  if (raw === 'completed') return 'completed'
  if (raw === 'awaiting_buyer_confirmation') return 'awaiting_buyer_confirmation'
  if (raw === 'keys_released' || raw === 'scheduled') return 'scheduled'
  if (raw === 'buyer_signed' || raw === 'documents_signed') return 'documents_signed'
  if (raw === 'awaiting_buyer_signature') return 'awaiting_buyer_signature'
  if (
    raw === 'docs_submitted' ||
    raw === 'docs_verified' ||
    raw === 'reach_signed' ||
    raw === 'action_required'
  ) {
    return 'action_required'
  }
  // pending, in_progress, pending_developer_docs, payment_confirmed
  return 'pending_documents'
}

/**
 * Map database handover status to developer-facing UI status
 */
function deriveDeveloperUIStatus(handover: any): string {
  const raw = (handover.status || '').toLowerCase()
  if (raw === 'completed') return 'completed'
  if (raw === 'awaiting_buyer_confirmation') return 'awaiting_buyer_confirmation'
  if (raw === 'scheduled') return 'scheduled'
  if (raw === 'buyer_signed' || raw === 'documents_signed') return 'documents_signed'
  if (raw === 'awaiting_buyer_signature' || raw === 'docs_submitted') return 'awaiting_buyer_signature'
  if (raw === 'docs_verified' || raw === 'reach_signed') return 'docs_verified'
  // pending_developer_docs, payment_confirmed, pending
  return 'pending_documents'
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser()
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role') || ''
    const query = searchParams.get('q')?.trim().toLowerCase() || ''
    const statusFilter = searchParams.get('status') || ''

    // Determine if this is a developer or buyer request
    const isDeveloperRequest = role === 'developer' || currentUser.role === 'developer'

    if (currentUser.role !== 'buyer' && currentUser.role !== 'developer' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminSupabaseClient()

    // Build query based on role
    let handoversQuery = adminSupabase
      .from('handovers')
      .select(
        '*, properties(id, title, location, asking_price, developer_id, property_media(url, order_index, media_type))'
      )
      .order('created_at', { ascending: false })

    if (isDeveloperRequest && currentUser.role !== 'admin') {
      handoversQuery = handoversQuery.eq('developer_id', currentUser.id)
    } else if (!isDeveloperRequest && currentUser.role !== 'admin') {
      handoversQuery = handoversQuery.eq('buyer_id', currentUser.id)
    }

    const { data: handovers, error: handoversError } = await handoversQuery

    if (handoversError) {
      throw new Error('Failed to fetch handovers')
    }

    // For each handover, check if documents have been uploaded
    const enriched = await Promise.all(
      (handovers || []).map(async (handover: any) => {
        const property = handover.properties || {}
        const location = property.location || {}
        const uiStatus = isDeveloperRequest
          ? deriveDeveloperUIStatus(handover)
          : deriveUIStatus(handover)

        // Count property documents
        const { count: docCount } = await adminSupabase
          .from('property_documents')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', handover.property_id)

        return {
          id: handover.id,
          propertyId: handover.property_id,
          property: {
            id: property.id,
            title: property.title || 'Property',
            location: [location.address, location.city, location.state]
              .filter(Boolean)
              .join(', ') || 'Location not available',
            fullAddress: location.address || '',
            price: property.asking_price || 0,
            developerId: property.developer_id,
          },
          paymentId: handover.transaction_id,
          buyerId: handover.buyer_id,
          developerId: handover.developer_id,
          status: uiStatus,
          dbStatus: handover.status,
          documentsUploaded: (docCount || 0) > 0,
          documentsUploadedAt: handover.documents_submitted_at || null,
          documentsSigned: !!handover.buyer_signed_at,
          documentsSignedAt: handover.buyer_signed_at || null,
          physicalHandoverDate: handover.physical_handover_date || handover.keys_released_at || null,
          physicalHandoverTime: handover.physical_handover_time || null,
          physicalHandoverLocation: handover.physical_handover_location || null,
          physicalHandoverAttendeeName: handover.physical_handover_attendee_name || null,
          scheduledAt: handover.scheduled_at || null,
          developerConfirmedAt: handover.developer_confirmed_at || null,
          buyerConfirmedAt: handover.buyer_confirmed_at || null,
          completedAt: handover.completed_at || null,
          createdAt: handover.created_at,
        }
      })
    )

    // Apply status filter
    let filtered = statusFilter
      ? enriched.filter((h) => h.status === statusFilter)
      : enriched

    // Apply search filter
    filtered = query
      ? filtered.filter((h) => {
          const searchable = [h.property.title, h.property.location]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return searchable.includes(query)
        })
      : filtered

    return NextResponse.json({ handovers: filtered })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
