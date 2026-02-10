import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'
import { notificationHelpers } from '@/lib/services/notification-helper'
import { normalizeNigerianPhone } from '@/lib/utils/phone'

// Developer reschedule
export async function POST(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const inspectionId = params.inspectionId
    const body = await req.json()

    const { slot_time, type, buyer_name, buyer_email, buyer_phone } = body

    if (!slot_time) {
      throw new ValidationError('Slot time is required')
    }

    const adminSupabase = createAdminSupabaseClient()

    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(developer_id, title), leads(buyer_name, buyer_email, buyer_phone)')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection')
    }

    const oldSlotTime = inspection.slot_time

    if (currentUser.id !== inspection.properties?.developer_id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const devStatus = (inspection.status || '').toLowerCase()
    if (devStatus === 'cancelled' || devStatus === 'completed' || devStatus === 'withdrawn') {
      throw new ValidationError('Cannot reschedule a cancelled or completed inspection')
    }

    const { data: existingBookings } = await adminSupabase
      .from('inspections')
      .select('id')
      .eq('property_id', inspection.property_id)
      .eq('slot_time', slot_time)
      .in('status', ['booked', 'confirmed'])
      .neq('id', inspectionId)

    if (existingBookings && existingBookings.length > 0) {
      throw new ValidationError('This time slot is already booked')
    }

    const updateData: any = {
      slot_time,
      updated_at: new Date().toISOString(),
    }

    if (type) {
      updateData.type = type
    }

    if (inspection.lead_id && (buyer_name || buyer_email || buyer_phone)) {
      const leadUpdate: any = {}
      if (buyer_name) leadUpdate.buyer_name = buyer_name
      if (buyer_email) leadUpdate.buyer_email = buyer_email
      if (buyer_phone) leadUpdate.buyer_phone = buyer_phone

      if (Object.keys(leadUpdate).length > 0) {
        await adminSupabase.from('leads').update(leadUpdate).eq('id', inspection.lead_id)
      }
    }

    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to reschedule inspection')
    }

    try {
      const property = inspection.properties as any
      const lead = inspection.leads as any

      let buyerId = inspection.buyer_id
      if (!buyerId && (lead?.buyer_phone || lead?.buyer_email)) {
        let query = adminSupabase.from('users').select('id').eq('role', 'buyer')
        const conditions: string[] = []
        if (lead?.buyer_phone) {
          conditions.push(`phone.eq.${lead.buyer_phone}`)
        }
        if (lead?.buyer_email) {
          conditions.push(`email.eq.${lead.buyer_email}`)
        }
        if (conditions.length > 0) {
          query = query.or(conditions.join(','))
        }
        const { data: buyers } = await query.limit(1)
        if (buyers && buyers.length > 0) {
          buyerId = buyers[0].id
        }
      }

      if (buyerId && property?.title) {
        await notificationHelpers.inspectionRescheduled({
          developerId: currentUser.id,
          buyerId: buyerId,
          propertyId: inspection.property_id,
          propertyTitle: property.title,
          inspectionId: inspectionId,
          oldSlotTime: oldSlotTime,
          newSlotTime: slot_time,
          buyerName: lead?.buyer_name || inspection.buyer_name,
          buyerPhone: lead?.buyer_phone || inspection.buyer_phone,
        })
      }
    } catch (notifError) {
      console.error('Failed to send reschedule notification:', notifError)
    }

    return NextResponse.json({
      message: 'Inspection rescheduled successfully',
      inspection: updatedInspection,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

// Buyer reschedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const inspectionId = params.inspectionId
    const body = await req.json()

    const { slot_time } = body

    if (!slot_time) {
      throw new ValidationError('Slot time is required')
    }

    const adminSupabase = createAdminSupabaseClient()

    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(developer_id, title), leads(buyer_name, buyer_email, buyer_phone)')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection')
    }

    if (currentUser.role !== 'buyer' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (currentUser.role !== 'admin') {
      let hasAccess = inspection.buyer_id === currentUser.id
      if (!hasAccess) {
        const lead = inspection.leads as any
        const userEmail = currentUser.email?.toLowerCase()
        if (userEmail && lead?.buyer_email?.toLowerCase() === userEmail) {
          hasAccess = true
        }
        if (!hasAccess && lead?.buyer_phone && currentUser.phone) {
          try {
            const normalizedLeadPhone = normalizeNigerianPhone(lead.buyer_phone)
            const normalizedUserPhone = normalizeNigerianPhone(currentUser.phone)
            if (normalizedLeadPhone === normalizedUserPhone) {
              hasAccess = true
            }
          } catch {
            hasAccess = false
          }
        }
      }
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data: existingBookings } = await adminSupabase
      .from('inspections')
      .select('id')
      .eq('property_id', inspection.property_id)
      .eq('slot_time', slot_time)
      .in('status', ['booked', 'confirmed'])
      .neq('id', inspectionId)

    if (existingBookings && existingBookings.length > 0) {
      throw new ValidationError('This time slot is already booked')
    }

    // Block invalid transitions: cannot reschedule cancelled or completed
    const status = (inspection.status || '').toLowerCase()
    if (status === 'cancelled' || status === 'completed' || status === 'withdrawn') {
      throw new ValidationError('Cannot reschedule a cancelled or completed inspection')
    }

    const oldSlotTime = inspection.slot_time

    // Buyer reschedule: reset to booked and clear confirmation so developer must reconfirm
    const updatePayload: Record<string, unknown> = {
      slot_time,
      status: 'booked',
      confirmed_at: null,
      confirmed_by: null,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update(updatePayload)
      .eq('id', inspectionId)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to reschedule inspection')
    }

    try {
      const property = inspection.properties as any
      if (property?.developer_id) {
        await notificationHelpers.inspectionRescheduledByBuyer({
          developerId: property.developer_id,
          buyerId: inspection.buyer_id || currentUser.id,
          propertyId: inspection.property_id,
          propertyTitle: property.title,
          inspectionId,
          oldSlotTime,
          newSlotTime: slot_time,
          buyerName: inspection.leads?.buyer_name || inspection.buyer_name || currentUser.full_name,
          buyerPhone: inspection.leads?.buyer_phone || inspection.buyer_phone || currentUser.phone,
        })
      }
    } catch (notifError) {
      console.error('Failed to send buyer reschedule notification:', notifError)
    }

    return NextResponse.json({
      message: 'Inspection rescheduled successfully',
      inspection: updatedInspection,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
