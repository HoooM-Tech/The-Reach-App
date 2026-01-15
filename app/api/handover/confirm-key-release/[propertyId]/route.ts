import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireDeveloper } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const developer = await requireDeveloper()
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

    if (handover.developer_id !== developer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update handover status
    await supabase
      .from('handovers')
      .update({
        status: 'keys_released',
        keys_released_at: new Date().toISOString(),
      })
      .eq('id', handover.id)

    return NextResponse.json({
      message: 'Key release confirmed',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

