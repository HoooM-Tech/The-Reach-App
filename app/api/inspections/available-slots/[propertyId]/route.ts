import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { NotFoundError, handleError } from '@/lib/utils/errors'
import { localToUTC } from '@/lib/utils/time'

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

    // Verify property exists
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single()

    if (!property) {
      throw new NotFoundError('Property')
    }

    // Generate 15-minute slots (9 AM - 5 PM, Mon-Sat)
    // CRITICAL: Use central time utility to ensure UTC conversion is correct
    const slots: Array<{ time: string; available: boolean }> = []
    const startHour = 9
    const endHour = 17

    // Parse the requested date (YYYY-MM-DD format)
    const dateStr = requestedDate.toISOString().split('T')[0]

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Format time as HH:MM
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        
        // Convert local time to UTC using central utility
        const slotTimeUTC = localToUTC(dateStr, timeStr)

        // Check if slot is already booked
        const { data: existingBookings } = await supabase
          .from('inspections')
          .select('id')
          .eq('property_id', propertyId)
          .eq('slot_time', slotTimeUTC)
          .in('status', ['booked', 'confirmed'])

        slots.push({
          time: slotTimeUTC,
          available: !existingBookings || existingBookings.length === 0,
        })
      }
    }

    return NextResponse.json({
      date: dateParam,
      slots,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

