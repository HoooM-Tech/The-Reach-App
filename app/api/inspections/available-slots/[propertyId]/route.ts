import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { NotFoundError, handleError } from '@/lib/utils/errors'
import { localToUTC, parseTimestamp } from '@/lib/utils/time'

export async function GET(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    const propertyId = params.propertyId

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }

    const requestedDate = new Date(dateParam)
    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient() // Use admin client for public access

    // Verify property exists
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single()

    if (!property) {
      throw new NotFoundError('Property')
    }

    // Check if date is a valid day (Mon-Sat, 0 = Sunday, 6 = Saturday)
    const dayOfWeek = requestedDate.getDay()
    if (dayOfWeek === 0) {
      // Sunday - no slots available
      return NextResponse.json({
        date: dateParam,
        slots: [],
        message: 'No inspections available on Sundays'
      })
    }

    // Generate 15-minute slots (9 AM - 5 PM, Mon-Sat)
    // CRITICAL: Use central time utility to ensure UTC conversion is correct
    const slots: Array<{ time: string; available: boolean }> = []
    const startHour = 9
    const endHour = 17

    // Parse the requested date (YYYY-MM-DD format)
    const dateStr = requestedDate.toISOString().split('T')[0]
    
    // Calculate date range for the requested day (start and end of day in UTC)
    const dayStart = new Date(requestedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(requestedDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    // Get all booked inspections for this property on this date
    // Use date range query instead of exact match to handle timezone issues
    const { data: existingBookings, error: bookingsError } = await adminSupabase
      .from('inspections')
      .select('slot_time')
      .eq('property_id', propertyId)
      .in('status', ['booked', 'confirmed'])
      .gte('slot_time', dayStart.toISOString())
      .lte('slot_time', dayEnd.toISOString())

    if (bookingsError) {
      console.error('[Inspection Slots] Error fetching bookings:', bookingsError)
      // Continue with all slots available if query fails
    }

    // Create a Set of booked slot times for O(1) lookup
    const bookedSlots = new Set(
      (existingBookings || []).map((booking: any) => parseTimestamp(booking.slot_time).toISOString())
    )

    // Check if requested date is in the past
    const now = new Date()
    const isPastDate = requestedDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Format time as HH:MM
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        
        // Convert local time to UTC using central utility
        const slotTimeUTC = localToUTC(dateStr, timeStr)
        const slotTimeISO = new Date(slotTimeUTC).toISOString()

        // Check if slot is in the past
        const isPastSlot = new Date(slotTimeUTC) < now

        // Check if slot is already booked
        const isBooked = bookedSlots.has(slotTimeISO)

        slots.push({
          time: slotTimeUTC,
          available: !isPastDate && !isPastSlot && !isBooked,
        })
      }
    }

    // Log for debugging (remove in production if not needed)
    const availableCount = slots.filter(s => s.available).length
    const totalCount = slots.length
    console.log(`[Inspection Slots] Property ${propertyId}, Date ${dateParam}: ${availableCount}/${totalCount} slots available`)

    return NextResponse.json({
      date: dateParam,
      slots,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

