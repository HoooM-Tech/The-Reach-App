import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireDeveloper } from '@/lib/utils/auth'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const submitDocumentsSchema = z.object({
  documents: z.array(
    z.object({
      document_type: z.string(),
      file_url: z.string().url(),
    })
  ),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const developer = await requireDeveloper()
    const propertyId = params.propertyId
    const body = await req.json()
    const { documents } = submitDocumentsSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Verify handover exists and developer owns it
    const { data: handover, error: handoverError } = await supabase
      .from('handovers')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    if (handover.developer_id !== developer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Insert documents
    const documentRecords = documents.map((doc) => ({
      property_id: propertyId,
      document_type: doc.document_type,
      file_url: doc.file_url,
    }))

    const { error: docError } = await supabase
      .from('property_documents')
      .insert(documentRecords)

    if (docError) {
      throw new ValidationError(docError.message)
    }

    // Update handover status
    await supabase
      .from('handovers')
      .update({
        status: 'docs_submitted',
        documents_submitted_at: new Date().toISOString(),
      })
      .eq('id', handover.id)

    return NextResponse.json({
      message: 'Documents submitted successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

