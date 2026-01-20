import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { verifyPayment } from '@/lib/services/paystack'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const reference = params.reference
    const supabase = createServerSupabaseClient()

    // Verify payment with Paystack
    const paymentData = await verifyPayment(reference)

    if (!paymentData.status || paymentData.data.status !== 'success') {
      throw new ValidationError('Payment verification failed')
    }

    const { property_id, buyer_id, developer_id } = paymentData.data.metadata || {}

    if (!property_id || !buyer_id || !developer_id) {
      throw new ValidationError('Invalid payment metadata')
    }

    // Get property to determine creator commission
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single()

    if (!property) {
      throw new NotFoundError('Property')
    }

    // Get creator from most recent lead for this property
    const { data: lead } = await supabase
      .from('leads')
      .select('creator_id')
      .eq('property_id', property_id)
      .eq('buyer_id', buyer_id)
      .not('creator_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const creatorId = lead?.creator_id || null

    // Calculate splits
    const amount = paymentData.data.amount / 100 // Convert from kobo
    const creatorCommission = creatorId ? amount * 0.15 : 0 // 15% creator commission
    const reachMargin = amount * 0.05 // 5% platform fee
    const developerAmount = amount - creatorCommission - reachMargin

    const splits = {
      developer_amount: developerAmount,
      creator_amount: creatorCommission,
      reach_amount: reachMargin,
    }

    // Create escrow transaction
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        property_id,
        buyer_id,
        developer_id,
        creator_id: creatorId,
        amount,
        splits,
        status: 'held',
        payment_reference: reference,
      })
      .select()
      .single()

    if (escrowError) {
      throw new ValidationError(escrowError.message)
    }

    // Create handover record
    const { data: handover, error: handoverError } = await supabase
      .from('handovers')
      .insert({
        property_id,
        transaction_id: escrow.id,
        developer_id,
        buyer_id,
        type: property.listing_type === 'sale' ? 'sale' : property.listing_type === 'rent' ? 'long_term_rental' : 'short_term_rental',
        status: 'payment_confirmed',
        payment_confirmed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (handoverError) {
      console.error('Handover creation error:', handoverError)
      // Don't fail the payment, but log the error
    }

    // Update property status
    await supabase
      .from('properties')
      .update({ status: property.listing_type === 'sale' ? 'sold' : 'rented' })
      .eq('id', property_id)

    // Update tracking link conversion if creator exists
    if (creatorId) {
      const { data: trackingLink } = await supabase
        .from('tracking_links')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('property_id', property_id)
        .single()

      if (trackingLink) {
        await supabase
          .from('tracking_links')
          .update({ conversions: (trackingLink.conversions || 0) + 1 })
          .eq('id', trackingLink.id)
      }
    }

    // Send notifications
    try {
      const { notificationHelpers } = await import('@/lib/services/notification-helper')
      await notificationHelpers.paymentConfirmed({
        buyerId,
        developerId,
        creatorId: creatorId || undefined,
        propertyId,
        propertyTitle: property.title,
        amount,
        transactionId: escrow.id,
        escrowId: escrow.id,
      })

      // Also notify about property being bought
      await notificationHelpers.propertyBought({
        developerId,
        buyerId,
        propertyId,
        propertyTitle: property.title,
        transactionId: escrow.id,
        amount,
      })
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      message: 'Payment verified and escrow created',
      escrow,
      handover,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

