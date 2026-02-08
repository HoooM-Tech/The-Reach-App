import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError } from '@/lib/utils/errors'

/**
 * Map document_type IDs to readable names
 */
const CATEGORY_NAMES: Record<string, string> = {
  deed_of_assignment: 'Deed of Assignment',
  title_document: 'Title Document',
  c_of_o: 'C of O',
  survey_plan: 'Survey Plan',
  proof_of_payment: 'Proof of Payment',
  letter_of_allocation: 'Letter of Allocation',
  possession_letter: 'Possession Letter',
}

export async function GET(
  req: NextRequest,
  { params }: { params: { handoverId: string; docId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const { handoverId, docId } = params

    const adminSupabase = createAdminSupabaseClient()

    // Get handover
    const { data: handover, error: handoverError } = await adminSupabase
      .from('handovers')
      .select('id, property_id, buyer_id, developer_id')
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

    // Get the specific document
    const { data: document, error: docError } = await adminSupabase
      .from('property_documents')
      .select('*')
      .eq('id', docId)
      .eq('property_id', handover.property_id)
      .single()

    if (docError || !document) {
      throw new NotFoundError('Document')
    }

    const docType = (document.document_type || '').toLowerCase().replace(/\s+/g, '_')
    const categoryName = CATEGORY_NAMES[docType] || document.document_type || 'Document'

    return NextResponse.json({
      id: document.id,
      categoryName,
      documentType: document.document_type,
      filename:
        document.file_url?.split('/').pop() ||
        `${categoryName.replace(/\s+/g, '_')}.pdf`,
      url: document.file_url,
      content: document.content || null,
      size: document.file_size || 0,
      uploadedAt: document.created_at,
      verifiedAt: document.verified_at,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

/**
 * DELETE - Remove a handover document (developer only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { handoverId: string; docId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const { handoverId, docId } = params

    if (currentUser.role !== 'developer' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminSupabaseClient()

    // Get handover
    const { data: handover, error: handoverError } = await adminSupabase
      .from('handovers')
      .select('id, property_id, buyer_id, developer_id, status')
      .eq('id', handoverId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    // Verify developer owns this handover
    if (currentUser.role !== 'admin' && handover.developer_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the document
    const { error: deleteError } = await adminSupabase
      .from('property_documents')
      .delete()
      .eq('id', docId)
      .eq('property_id', handover.property_id)

    if (deleteError) {
      throw new Error('Failed to delete document')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
