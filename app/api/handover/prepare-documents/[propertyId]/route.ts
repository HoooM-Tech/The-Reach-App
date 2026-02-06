import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'
import { signDocument } from '@/lib/utils/crypto'

export async function POST(
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

    if (handover.status !== 'docs_verified') {
      throw new ValidationError('Documents must be verified before Reach can sign')
    }

    // Generate digital signature
    const digitalSignature = signDocument(propertyId, admin.id, 'reach')

    // Update handover
    await supabase
      .from('handovers')
      .update({
        status: 'reach_signed',
        reach_signed_at: new Date().toISOString(),
      })
      .eq('id', handover.id)

    // TODO: Apply watermark to documents and prepare for buyer signature

    return NextResponse.json({
      message: 'Documents prepared and signed by Reach',
      signature: digitalSignature,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

