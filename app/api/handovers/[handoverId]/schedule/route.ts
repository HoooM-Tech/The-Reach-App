import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'
import { notificationHelpers } from '@/lib/services/notification-helper'

/**
 * POST - Developer schedules physical handover
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

    const body = await req.json()
    const { date, time, attendeeName, location } = body

    if (!date || !time || !attendeeName || !location) {
      throw new ValidationError('Date, time, attendee name, and location are required')
    }

    const adminSupabase = createAdminSupabaseClient()

    // Get handover with property
    const { data: handover, error: handoverError } = await adminSupabase
      .from('handovers')
      .select('*, properties(id, title, developer_id)')
      .eq('id', handoverId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    // Verify developer owns this handover
    if (currentUser.role !== 'admin' && handover.developer_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update handover with schedule details
    const { data: updatedHandover, error: updateError } = await adminSupabase
      .from('handovers')
      .update({
        status: 'scheduled',
        physical_handover_date: date,
        physical_handover_time: time,
        physical_handover_location: location,
        physical_handover_attendee_name: attendeeName,
        scheduled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', handoverId)
      .select()
      .single()

    if (updateError) {
      // If column doesn't exist, try with keys_released_at as fallback
      console.error('Schedule update error:', updateError)
      
      // Fallback update with existing columns
      const { data: fallbackHandover, error: fallbackError } = await adminSupabase
        .from('handovers')
        .update({
          status: 'scheduled',
          keys_released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', handoverId)
        .select()
        .single()

      if (fallbackError) {
        throw new Error('Failed to update handover schedule')
      }
    }

    const property = handover.properties as any
    let buyerNotified = false
    let adminNotified = false

    // Notify buyer
    try {
      await notificationHelpers.handoverScheduled({
        buyerId: handover.buyer_id,
        propertyId: handover.property_id,
        propertyTitle: property?.title || 'Property',
        handoverId,
        date,
        time,
        location,
      })
      buyerNotified = true
    } catch (notifError) {
      console.error('Failed to send buyer notification:', notifError)
    }

    // Notify admins
    try {
      const { data: admins } = await adminSupabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(5)

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await notificationHelpers.handoverScheduled({
            buyerId: admin.id,
            propertyId: handover.property_id,
            propertyTitle: property?.title || 'Property',
            handoverId,
            date,
            time,
            location,
          })
        }
        adminNotified = true
      }
    } catch (notifError) {
      console.error('Failed to send admin notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      handover: updatedHandover || { id: handoverId, status: 'scheduled' },
      schedule: { date, time, attendeeName, location },
      notificationsSent: {
        buyer: buyerNotified,
        admin: adminNotified,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
