import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'

/**
 * Standard document categories for handover, in display order
 */
const DOCUMENT_CATEGORIES = [
  { id: 'deed_of_assignment', name: 'Deed of Assignment', required: true, order: 1 },
  { id: 'title_document', name: 'Title Document', required: true, order: 2 },
  { id: 'c_of_o', name: 'C of O', required: false, order: 3 },
  { id: 'survey_plan', name: 'Survey Plan', required: false, order: 4 },
  { id: 'proof_of_payment', name: 'Proof of Payment', required: false, order: 5 },
  { id: 'letter_of_allocation', name: 'Letter of Allocation', required: false, order: 6 },
  { id: 'possession_letter', name: 'Possession Letter', required: false, order: 7 },
]

export async function GET(
  req: NextRequest,
  { params }: { params: { handoverId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const handoverId = params.handoverId

    const adminSupabase = createAdminSupabaseClient()

    // Get handover
    const { data: handover, error: handoverError } = await adminSupabase
      .from('handovers')
      .select('id, property_id, buyer_id, developer_id, buyer_signed_at')
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

    // Get all property documents
    const { data: documents } = await adminSupabase
      .from('property_documents')
      .select('*')
      .eq('property_id', handover.property_id)
      .order('created_at', { ascending: true })

    // Get buyer's signed documents from vault
    const { data: vaultDocs } = await adminSupabase
      .from('document_vault')
      .select('*')
      .eq('property_id', handover.property_id)
      .eq('user_id', handover.buyer_id)

    const vaultTypes = new Set(
      (vaultDocs || []).map((d: any) => d.document_type?.toLowerCase())
    )

    // Map documents into categories
    const categories = DOCUMENT_CATEGORIES.map((category) => {
      const matchingDoc = (documents || []).find(
        (doc: any) =>
          doc.document_type?.toLowerCase() === category.id ||
          doc.document_type?.toLowerCase().replace(/\s+/g, '_') === category.id
      )

      const isSigned =
        !!handover.buyer_signed_at ||
        vaultTypes.has(category.id)

      return {
        id: category.id,
        name: category.name,
        required: category.required,
        order: category.order,
        uploaded: !!matchingDoc,
        signed: isSigned,
        document: matchingDoc
          ? {
              id: matchingDoc.id,
              filename:
                matchingDoc.file_url?.split('/').pop() ||
                `${category.name.replace(/\s+/g, '_')}.pdf`,
              url: matchingDoc.file_url,
              size: matchingDoc.file_size || 0,
              uploadedAt: matchingDoc.created_at,
              verifiedAt: matchingDoc.verified_at,
            }
          : null,
      }
    })

    return NextResponse.json({
      categories,
      allSigned: !!handover.buyer_signed_at,
      documentsCount: documents?.length || 0,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

/**
 * POST - Upload a document for a handover category (developer only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { handoverId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const handoverId = params.handoverId

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

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const categoryId = formData.get('categoryId') as string | null

    if (!file || !categoryId) {
      throw new ValidationError('File and category are required')
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      throw new ValidationError('File size exceeds 2MB limit')
    }

    // Upload file to Supabase storage
    const fileExt = file.name.split('.').pop() || 'pdf'
    const fileName = `handover_${handoverId}_${categoryId}_${Date.now()}.${fileExt}`
    const filePath = `handover-documents/${handover.property_id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await adminSupabase
      .storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      // Fallback: store without actual file upload if storage isn't configured
    }

    // Get public URL
    const { data: urlData } = adminSupabase
      .storage
      .from('documents')
      .getPublicUrl(filePath)

    const fileUrl = urlData?.publicUrl || filePath

    // Check if document already exists for this category
    const { data: existingDoc } = await adminSupabase
      .from('property_documents')
      .select('id')
      .eq('property_id', handover.property_id)
      .eq('document_type', categoryId)
      .single()

    let document
    if (existingDoc) {
      // Update existing document
      const { data: updatedDoc, error: updateError } = await adminSupabase
        .from('property_documents')
        .update({
          file_url: fileUrl,
          file_size: file.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDoc.id)
        .select()
        .single()

      if (updateError) throw new Error('Failed to update document')
      document = updatedDoc
    } else {
      // Create new document
      const { data: newDoc, error: insertError } = await adminSupabase
        .from('property_documents')
        .insert({
          property_id: handover.property_id,
          document_type: categoryId,
          file_url: fileUrl,
          file_size: file.size,
          uploaded_by: currentUser.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw new Error('Failed to save document record')
      document = newDoc
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        categoryId,
        filename: file.name,
        url: fileUrl,
        size: file.size,
        uploadedAt: document.created_at,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
