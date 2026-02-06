import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const admin = await requireAdmin()
    const propertyId = params.propertyId
    const supabase = createServerSupabaseClient()

    // Get handover
    const { data: handover, error: handoverError } = await supabase
      .from('handovers')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    // Verify all documents
    const { error: verifyError } = await supabase
      .from('property_documents')
      .update({
        verified_at: new Date().toISOString(),
        verified_by: admin.id,
      })
      .eq('property_id', propertyId)
      .is('verified_at', null)

    if (verifyError) {
      throw new Error(verifyError.message)
    }

    // Update handover status
    await supabase
      .from('handovers')
      .update({
        status: 'docs_verified',
        documents_verified_at: new Date().toISOString(),
      })
      .eq('id', handover.id)

    return NextResponse.json({
      message: 'Documents verified successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

