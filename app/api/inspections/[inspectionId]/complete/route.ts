import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'
import { notificationHelpers } from '@/lib/services/notification-helper'

function parseSlotTime(slotTime: string | null): Date | null {
  if (!slotTime) return null
  try {
    const d = new Date(slotTime)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

async function completeInspectionHandler(
  req: NextRequest,
  inspectionId: string
): Promise<NextResponse> {
  const currentUser = await getAuthenticatedUser()

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

  const property = inspection.properties as { developer_id?: string; title?: string } | null
  if (currentUser.role !== 'admin' && currentUser.id !== property?.developer_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const status = (inspection.status || '').toLowerCase()
  const scheduledAt = parseSlotTime(inspection.slot_time)
  const now = new Date()
  const slotTimePassed = scheduledAt ? now >= scheduledAt : true

  // Allow complete when: (1) status is confirmed, or (2) status is booked and slot time has passed (developer can mark complete without having confirmed first)
  if (status !== 'confirmed' && !(status === 'booked' && slotTimePassed)) {
    throw new ValidationError(
      'Only scheduled (confirmed) or past-due booked inspections can be marked complete. Current status: ' + inspection.status
    )
  }
  if (scheduledAt && now < scheduledAt) {
    throw new ValidationError(
      'Cannot mark inspection complete before the scheduled date and time.'
    )
  }

  let notes: string | undefined
  let completedAt: string | undefined
  try {
    const body = req.method !== 'GET' && req.body ? await req.json().catch(() => ({})) : {}
    notes = typeof body.notes === 'string' ? body.notes.trim() || undefined : undefined
    completedAt =
      typeof body.completedAt === 'string' ? body.completedAt : new Date().toISOString()
  } catch {
    completedAt = new Date().toISOString()
  }
  if (!completedAt) completedAt = new Date().toISOString()

  const { data: updatedInspection, error: updateError } = await adminSupabase
    .from('inspections')
    .update({
      status: 'completed',
      completed_at: completedAt,
      completion_notes: notes ?? null,
      auto_completed: false,
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
        propertyTitle: property?.title ?? 'Property',
        inspectionId,
      })
    }
  } catch (notifError) {
    console.error('Failed to send completion notification:', notifError)
  }

  try {
    const { data: admins } = await adminSupabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(10)

    if (admins?.length) {
      for (const admin of admins) {
        await notificationHelpers.inspectionCompletedAdmin({
          adminId: admin.id,
          propertyId: inspection.property_id,
          propertyTitle: property?.title ?? 'Property',
          inspectionId,
          developerId: property?.developer_id,
          buyerId: inspection.buyer_id,
        })
      }
    }
  } catch (notifError) {
    console.error('Failed to send inspection completed (admin) notification:', notifError)
  }

  return NextResponse.json({
    success: true,
    message: 'Inspection marked as completed',
    inspection: updatedInspection,
    notificationsSent: { buyer: !!inspection.buyer_id },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    return await completeInspectionHandler(req, params.inspectionId)
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    return await completeInspectionHandler(req, params.inspectionId)
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
