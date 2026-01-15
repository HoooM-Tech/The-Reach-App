import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { inspectionBookingSchema } from '@/lib/utils/validation'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { sendSMS } from '@/lib/services/termii'
import { normalizePhoneNumber } from '@/lib/utils/phone'
import { getAuthenticatedUser } from '@/lib/utils/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = inspectionBookingSchema.parse(body)
    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient() // Use admin client to read leads (can be created by anonymous users)

    // Verify lead exists - use admin client since leads can be created by anonymous users
    const { data: lead, error: leadError } = await adminSupabase
      .from('leads')
      .select('*, properties(*)')
      .eq('id', validated.lead_id)
      .single()

    if (leadError || !lead) {
      console.error('Lead lookup error:', leadError)
      throw new NotFoundError('Lead')
    }

    // Verify property matches
    if (lead.property_id !== validated.property_id) {
      throw new ValidationError('Lead does not match property')
    }

    // Check if slot is still available - use admin client for public access
    // Check for any existing bookings (not just one) to handle race conditions
    const { data: existingBookings, error: checkError } = await adminSupabase
      .from('inspections')
      .select('id')
      .eq('property_id', validated.property_id)
      .eq('slot_time', validated.slot_time)
      .in('status', ['booked', 'confirmed'])

    if (checkError) {
      console.error('Error checking existing bookings:', checkError)
      throw new ValidationError('Failed to check slot availability')
    }

    if (existingBookings && existingBookings.length > 0) {
      throw new ValidationError('Time slot is no longer available')
    }

    // Get buyer_id - first check if user is authenticated, then try to match by phone
    let buyerId: string | null = null
    
    // Check if user is authenticated
    try {
      const user = await getAuthenticatedUser()
      if (user.role === 'buyer' || user.role === 'creator') {
        buyerId = user.id
      }
    } catch (authError) {
      // User is not authenticated, continue to phone matching
    }
    
    // If not found by authentication, try to match by normalized phone
    if (!buyerId && lead.buyer_phone) {
      const normalizedLeadPhone = normalizePhoneNumber(lead.buyer_phone)
      // Get all buyers and match by normalized phone
      const { data: allBuyers } = await adminSupabase
        .from('users')
        .select('id, phone')
        .eq('role', 'buyer')
      
      if (allBuyers) {
        const matchingBuyer = allBuyers.find((buyer: any) => {
          if (!buyer.phone) return false
          const normalizedBuyerPhone = normalizePhoneNumber(buyer.phone)
          return normalizedBuyerPhone === normalizedLeadPhone
        })
        if (matchingBuyer) {
          buyerId = matchingBuyer.id
        }
      }
    }

    // Create inspection booking - use admin client for public access
    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .insert({
        lead_id: validated.lead_id,
        property_id: validated.property_id,
        buyer_id: buyerId,
        slot_time: validated.slot_time,
        status: 'booked',
      })
      .select()
      .single()

    if (inspectionError) {
      console.error('Inspection insert error:', inspectionError)
      throw new ValidationError(inspectionError.message)
    }

    // Update lead status - use admin client
    await adminSupabase
      .from('leads')
      .update({ status: 'inspection_booked' })
      .eq('id', validated.lead_id)

    // Update tracking link if creator exists - use admin client
    if (lead.creator_id) {
      const { data: trackingLink } = await adminSupabase
        .from('tracking_links')
        .select('*')
        .eq('creator_id', lead.creator_id)
        .eq('property_id', validated.property_id)
        .maybeSingle()

      if (trackingLink) {
        await adminSupabase
          .from('tracking_links')
          .update({ inspections: (trackingLink.inspections || 0) + 1 })
          .eq('id', trackingLink.id)
      }
    }

    // Send SMS confirmation to buyer
    try {
      const slotDate = new Date(validated.slot_time)
      const message = `Your inspection for ${lead.properties?.title || 'property'} is scheduled for ${slotDate.toLocaleDateString()} at ${slotDate.toLocaleTimeString()}. Reply CANCEL to cancel.`
      await sendSMS(lead.buyer_phone, message)
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError)
    }

    // Send notification to developer
    try {
      // Get property to find developer
      const { data: property } = await adminSupabase
        .from('properties')
        .select('developer_id, title')
        .eq('id', validated.property_id)
        .single()

      if (property?.developer_id) {
        const slotDate = new Date(validated.slot_time)
        await adminSupabase
          .from('notifications')
          .insert({
            user_id: property.developer_id,
            type: 'inspection_booked',
            title: 'Inspection Booked',
            body: `An inspection has been booked for "${property.title}" on ${slotDate.toLocaleDateString()} at ${slotDate.toLocaleTimeString()}`,
            data: {
              inspection_id: inspection.id,
              property_id: validated.property_id,
              property_title: property.title,
              slot_time: validated.slot_time,
              buyer_name: lead.buyer_name,
              buyer_phone: lead.buyer_phone,
            },
            read: false,
          })
      }
    } catch (notifError) {
      console.error('Failed to send notification to developer:', notifError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        message: 'Inspection booked successfully',
        inspection,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

