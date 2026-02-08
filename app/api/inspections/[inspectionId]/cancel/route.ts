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

    if (!inspectionId) {
      throw new ValidationError('Inspection ID is required')
    }

    const adminSupabase = createAdminSupabaseClient()

    // Fetch inspection with property and lead details
    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(developer_id, title), leads(buyer_name, buyer_email, buyer_phone)')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection')
    }

    const property = inspection.properties as any

    // -----------------------------------------------
    // Authorization: determine who is cancelling
    // -----------------------------------------------
    let cancelledBy: 'buyer' | 'developer' | 'admin'

    if (currentUser.role === 'admin') {
      cancelledBy = 'admin'
    } else if (currentUser.role === 'buyer') {
      // Buyer must own the inspection
      if (inspection.buyer_id !== currentUser.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      cancelledBy = 'buyer'
    } else if (currentUser.role === 'developer') {
      // Developer must own the property
      if (currentUser.id !== property?.developer_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      cancelledBy = 'developer'
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // -----------------------------------------------
    // Prevent cancelling completed or already cancelled
    // -----------------------------------------------
    const currentStatus = (inspection.status || '').toLowerCase()

    if (currentStatus === 'completed') {
      throw new ValidationError('Completed inspections cannot be cancelled')
    }

    if (currentStatus === 'cancelled') {
      throw new ValidationError('This inspection is already cancelled')
    }

    if (currentStatus === 'withdrawn') {
      throw new ValidationError('Withdrawn inspections cannot be cancelled')
    }

    // -----------------------------------------------
    // Update inspection to cancelled
    // -----------------------------------------------
    const now = new Date().toISOString()

    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update({
        status: 'cancelled',
        cancelled_by: cancelledBy,
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', inspectionId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to cancel inspection:', updateError)
      throw new Error('Failed to cancel inspection')
    }

    // -----------------------------------------------
    // Send notifications to the other party
    // -----------------------------------------------
    try {
      if (cancelledBy === 'buyer' || cancelledBy === 'admin') {
        // Notify developer
        if (property?.developer_id) {
          const lead = inspection.leads as any
          await notificationHelpers.inspectionCancelledByBuyer({
            developerId: property.developer_id,
            buyerId: inspection.buyer_id || currentUser.id,
            propertyId: inspection.property_id,
            propertyTitle: property.title || 'Property',
            inspectionId,
            buyerName: lead?.buyer_name || inspection.buyer_name || currentUser.full_name,
          })
        }
      }

      if (cancelledBy === 'developer' || cancelledBy === 'admin') {
        // Notify buyer
        if (inspection.buyer_id) {
          await notificationHelpers.inspectionCancelledByDeveloper({
            buyerId: inspection.buyer_id,
            propertyId: inspection.property_id,
            propertyTitle: property?.title || 'Property',
            inspectionId,
          })
        }
      }
    } catch (notifError) {
      // Don't fail the request if notification fails
      console.error('Failed to send cancellation notification:', notifError)
    }

    return NextResponse.json({
      message: 'Inspection cancelled successfully',
      inspection: updatedInspection,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
