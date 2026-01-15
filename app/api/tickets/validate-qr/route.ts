import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { verifyHash } from '@/lib/utils/crypto'
import { z } from 'zod'

const validateQRSchema = z.object({
  qr_data: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    await requireAdmin() // Only admins/event staff can validate tickets
    const body = await req.json()
    const { qr_data } = validateQRSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Parse QR data
    let qrData: any
    try {
      qrData = JSON.parse(qr_data)
    } catch {
      throw new ValidationError('Invalid QR code format')
    }

    const { ticket_id, signature } = qrData

    if (!ticket_id || !signature) {
      throw new ValidationError('Invalid QR code data')
    }

    // Verify signature
    if (!verifyHash(ticket_id, signature)) {
      throw new ValidationError('Invalid QR code signature')
    }

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, events(*)')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      throw new NotFoundError('Ticket')
    }

    // Check if already used
    if (ticket.status === 'used') {
      return NextResponse.json({
        valid: false,
        reason: 'Ticket already used',
        ticket: {
          id: ticket.id,
          validated_at: ticket.validated_at,
        },
      })
    }

    // Check if event date has passed
    const eventDate = new Date(ticket.events?.date || '')
    if (eventDate < new Date()) {
      return NextResponse.json({
        valid: false,
        reason: 'Event date has passed',
      })
    }

    // Validate ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        validated_at: new Date().toISOString(),
      })
      .eq('id', ticket_id)
      .select()
      .single()

    if (updateError) {
      throw new ValidationError(updateError.message)
    }

    return NextResponse.json({
      valid: true,
      ticket: updatedTicket,
      event: ticket.events,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

