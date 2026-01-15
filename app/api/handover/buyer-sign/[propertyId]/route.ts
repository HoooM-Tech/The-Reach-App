import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'
import { signDocument } from '@/lib/utils/crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const buyer = await getAuthenticatedUser()
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

    if (handover.buyer_id !== buyer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (handover.status !== 'reach_signed') {
      throw new ValidationError('Reach must sign documents first')
    }

    // Generate digital signature
    const digitalSignature = signDocument(propertyId, buyer.id, 'buyer')
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Update handover
    await supabase
      .from('handovers')
      .update({
        status: 'buyer_signed',
        buyer_signed_at: new Date().toISOString(),
      })
      .eq('id', handover.id)

    // Add documents to buyer's vault
    const { data: propertyDocs } = await supabase
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)

    if (propertyDocs && propertyDocs.length > 0) {
      const vaultDocs = propertyDocs.map((doc) => ({
        user_id: buyer.id,
        property_id: propertyId,
        document_type: doc.document_type,
        file_url: doc.file_url,
        signed_at: new Date().toISOString(),
      }))

      await supabase.from('document_vault').insert(vaultDocs)
    }

    return NextResponse.json({
      message: 'Documents signed successfully',
      signature: digitalSignature,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

