import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { handoverId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const handoverId = params.handoverId

    const adminSupabase = createAdminSupabaseClient()

    const { data: handover, error: handoverError } = await adminSupabase
      .from('handovers')
      .select(
        '*, properties(id, title, description, location, asking_price, developer_id, property_media(url, order_index, media_type))'
      )
      .eq('id', handoverId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    // Access control
    if (
      currentUser.role !== 'admin' &&
      handover.buyer_id !== currentUser.id &&
      handover.developer_id !== currentUser.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get property documents
    const { data: documents } = await adminSupabase
      .from('property_documents')
      .select('*')
      .eq('property_id', handover.property_id)
      .order('created_at', { ascending: true })

    // Get document vault entries (buyer's signed docs)
    const { data: vaultDocs } = await adminSupabase
      .from('document_vault')
      .select('*')
      .eq('property_id', handover.property_id)
      .eq('user_id', handover.buyer_id)

    const property = handover.properties || {}
    const location = property.location || {}

    return NextResponse.json({
      id: handover.id,
      propertyId: handover.property_id,
      property: {
        id: property.id,
        title: property.title || 'Property',
        description: property.description || '',
        location: [location.address, location.city, location.state]
          .filter(Boolean)
          .join(', '),
        fullAddress: location.address || '',
        price: property.asking_price || 0,
        developerId: property.developer_id,
      },
      paymentId: handover.transaction_id,
      buyerId: handover.buyer_id,
      developerId: handover.developer_id,
      status: handover.status,
      documentsUploaded: (documents?.length || 0) > 0,
      documentsSigned: !!handover.buyer_signed_at,
      signedAt: handover.buyer_signed_at || null,
      reachSignedAt: handover.reach_signed_at || null,
      documentsVerifiedAt: handover.documents_verified_at || null,
      documentsSubmittedAt: handover.documents_submitted_at || null,
      keysReleasedAt: handover.keys_released_at || null,
      completedAt: handover.completed_at || null,
      createdAt: handover.created_at,
      documents: documents || [],
      vaultDocuments: vaultDocs || [],
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
