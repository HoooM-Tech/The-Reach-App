import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { inspectionBookingSchema } from '@/lib/utils/validation'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { sendSMS } from '@/lib/services/termii'
import { normalizeNigerianPhone } from '@/lib/utils/phone'
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
      const normalizedLeadPhone = normalizeNigerianPhone(lead.buyer_phone)
      // Get all buyers and match by normalized phone
      const { data: allBuyers } = await adminSupabase
        .from('users')
        .select('id, phone')
        .eq('role', 'buyer')
      
      if (allBuyers) {
        const matchingBuyer = allBuyers.find((buyer: any) => {
          if (!buyer.phone) return false
          try {
            const normalizedBuyerPhone = normalizeNigerianPhone(buyer.phone)
            return normalizedBuyerPhone === normalizedLeadPhone
          } catch {
            return false
          }
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
    // This tracks inspections for creator analytics (only for active promotions)
    if (lead.creator_id) {
      const { data: trackingLink } = await adminSupabase
        .from('tracking_links')
        .select('id, inspections, status, expires_at')
        .eq('creator_id', lead.creator_id)
        .eq('property_id', validated.property_id)
        .maybeSingle()

      if (trackingLink) {
        // Check if promotion is active and not expired
        const now = new Date();
        const isExpired = trackingLink.expires_at && new Date(trackingLink.expires_at) < now;
        const isActive = trackingLink.status === 'active' && !isExpired;

        // Only increment analytics for active promotions
        if (isActive) {
          const currentInspections = trackingLink.inspections || 0
          await adminSupabase
            .from('tracking_links')
            .update({ inspections: currentInspections + 1 })
            .eq('id', trackingLink.id)
        } else {
          // Auto-expire if needed
          if (trackingLink.status === 'active' && isExpired) {
            const expireData: any = {
              status: 'expired',
              expired_at: now.toISOString(),
            };
            
            const { error: expireError } = await adminSupabase
              .from('tracking_links')
              .update(expireData)
              .eq('id', trackingLink.id);
            
            // Ignore errors about missing updated_at column (migration not run yet)
            if (expireError && !expireError.message?.includes('updated_at')) {
              console.error('Failed to auto-expire promotion:', expireError);
            }
            
            console.log('[Promotion Lifecycle] Auto-expired', {
              promotion_id: trackingLink.id,
              timestamp: now.toISOString(),
              action: 'auto-expire',
            });
          }
        }
      }
    }

    // Send SMS confirmation to buyer
    try {
      // Use central time utility for consistent formatting
      const { formatInspectionTime } = await import('@/lib/utils/time')
      const formattedDateTime = formatInspectionTime(validated.slot_time, {
        includeDate: true,
        includeTime: true,
        timeFormat: '12h',
      })
      const message = `Your inspection for ${lead.properties?.title || 'property'} is scheduled for ${formattedDateTime}. Reply CANCEL to cancel.`
      await sendSMS(lead.buyer_phone, message)
    } catch (smsError) {
      console.error('Failed to send SMS:', smsError)
    }

    // Send notifications using helper
    try {
      const { data: property } = await adminSupabase
        .from('properties')
        .select('developer_id, title')
        .eq('id', validated.property_id)
        .single()

      if (property?.developer_id) {
        const { notificationHelpers } = await import('@/lib/services/notification-helper')
        await notificationHelpers.inspectionBooked({
          developerId: property.developer_id,
          buyerId: lead?.buyer_id || undefined,
          propertyId: validated.property_id,
          propertyTitle: property.title,
          inspectionId: inspection.id,
          slotTime: validated.slot_time,
          buyerName: lead?.buyer_name,
          buyerPhone: lead?.buyer_phone,
        })
      }
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError)
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

