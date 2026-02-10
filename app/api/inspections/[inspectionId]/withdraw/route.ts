import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'
import { notificationHelpers } from '@/lib/services/notification-helper'

export async function POST(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const inspectionId = params.inspectionId

    if (currentUser.role !== 'buyer' && currentUser.role !== 'admin') {
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

    if (currentUser.role !== 'admin' && inspection.buyer_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (inspection.status !== 'completed') {
      throw new ValidationError('Only completed inspections can be withdrawn')
    }

    let reason: string | undefined
    try {
      const body = await req.json().catch(() => ({}))
      reason = typeof body.reason === 'string' ? body.reason.trim() || undefined : undefined
    } catch {
      // no body
    }

    const withdrawnAt = new Date().toISOString()
    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update({
        status: 'withdrawn',
        withdrawn_at: withdrawnAt,
        withdrawal_reason: reason ?? null,
        updated_at: withdrawnAt,
      })
      .eq('id', inspectionId)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to withdraw inspection interest')
    }

    try {
      const property = inspection.properties as any
      if (property?.developer_id) {
        await notificationHelpers.inspectionInterestWithdrawn({
          developerId: property.developer_id,
          buyerId: inspection.buyer_id || currentUser.id,
          propertyId: inspection.property_id,
          propertyTitle: property.title,
          inspectionId,
        })
      }
    } catch (notifError) {
      console.error('Failed to send withdraw notification:', notifError)
    }

    return NextResponse.json({
      message: 'Interest withdrawn successfully',
      inspection: updatedInspection,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
