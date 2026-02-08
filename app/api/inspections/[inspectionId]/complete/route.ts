import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError } from '@/lib/utils/errors'
import { notificationHelpers } from '@/lib/services/notification-helper'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const inspectionId = params.inspectionId

    if (currentUser.role !== 'developer' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminSupabaseClient()

    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(developer_id, title)')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection')
    }

    const property = inspection.properties as any
    if (currentUser.role !== 'admin' && currentUser.id !== property?.developer_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inspectionId)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to complete inspection')
    }

    try {
      if (inspection.buyer_id) {
        await notificationHelpers.inspectionCompleted({
          buyerId: inspection.buyer_id,
          propertyId: inspection.property_id,
          propertyTitle: property?.title,
          inspectionId,
        })
      }
    } catch (notifError) {
      console.error('Failed to send completion notification:', notifError)
    }

    return NextResponse.json({
      message: 'Inspection marked as completed',
      inspection: updatedInspection,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
