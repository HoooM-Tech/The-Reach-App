import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { eventSchema } from '@/lib/utils/validation'
import { ValidationError, handleError } from '@/lib/utils/errors'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    
    // Only organizers and admins can create events
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = eventSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Create event
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        organizer_id: user.id,
        title: validated.title,
        description: validated.description,
        venue: validated.venue,
        date: validated.date,
        capacity: validated.capacity,
        ticket_price: validated.ticket_price,
        creator_commission_rate: validated.creator_commission_rate,
        verification_status: 'pending',
        status: 'draft',
        tickets_sold: 0,
      })
      .select()
      .single()

    if (error) {
      throw new ValidationError(error.message)
    }

    return NextResponse.json(
      {
        message: 'Event created successfully',
        event,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

