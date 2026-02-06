import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { ticketPurchaseSchema } from '@/lib/utils/validation'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { generateSecureHash } from '@/lib/utils/crypto'
import QRCode from 'qrcode'

export async function POST(req: NextRequest) {
  try {
    const buyer = await getAuthenticatedUser()
    const body = await req.json()
    const { event_id, quantity } = ticketPurchaseSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      throw new NotFoundError('Event')
    }

    if (event.status !== 'active') {
      throw new ValidationError('Event is not active for ticket sales')
    }

    if (event.verification_status !== 'verified') {
      throw new ValidationError('Event must be verified before ticket sales')
    }

    // Check capacity
    if ((event.tickets_sold || 0) + quantity > event.capacity) {
      throw new ValidationError('Not enough tickets available')
    }

    // Get tracking code from referrer (if purchased via creator link)
    const referer = req.headers.get('referer') || ''
    const trackingCode = referer.match(/\/events\/[^/]+\/p\/([a-f0-9]+)/)?.[1]
    let creatorId: string | null = null

    if (trackingCode) {
      // In a real implementation, you'd have an event_tracking_links table
      // For now, we'll extract creator from the tracking code if possible
      // This is a simplified version
    }

    // Calculate total amount
    const totalAmount = event.ticket_price * quantity

    // Create tickets
    const tickets = []
    for (let i = 0; i < quantity; i++) {
      const ticketId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
      const qrData = {
        ticket_id: ticketId,
        event_id: event_id,
        signature: generateSecureHash(ticketId),
      }

      // Generate QR code
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData))

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          event_id: event_id,
          buyer_id: buyer.id,
          creator_id: creatorId,
          qr_code: qrCode,
          status: 'active',
        })
        .select()
        .single()

      if (ticketError) {
        throw new ValidationError(`Failed to create ticket: ${ticketError.message}`)
      }

      tickets.push(ticket)
    }

    // Update event ticket count
    await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + quantity })
      .eq('id', event_id)

    // Check if event is sold out
    if ((event.tickets_sold || 0) + quantity >= event.capacity) {
      await supabase
        .from('events')
        .update({ status: 'sold_out' })
        .eq('id', event_id)
    }

    return NextResponse.json(
      {
        message: 'Tickets purchased successfully',
        tickets,
        total_amount: totalAmount,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

