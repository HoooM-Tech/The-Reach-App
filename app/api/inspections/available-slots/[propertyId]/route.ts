import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { NotFoundError, handleError } from '@/lib/utils/errors'

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
    const slots: Array<{ time: string; available: boolean }> = []
    const startHour = 9
    const endHour = 17

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const slotTime = new Date(requestedDate)
        slotTime.setHours(hour, minute, 0, 0)

        // Check if slot is already booked
        const { data: existingBookings } = await supabase
          .from('inspections')
          .select('id')
          .eq('property_id', propertyId)
          .eq('slot_time', slotTime.toISOString())
          .in('status', ['booked', 'confirmed'])

        slots.push({
          time: slotTime.toISOString(),
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

