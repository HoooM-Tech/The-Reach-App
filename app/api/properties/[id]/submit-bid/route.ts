import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { bidSchema } from '@/lib/utils/validation'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const buyer = await getAuthenticatedUser()
    const propertyId = params.id
    const body = await req.json()
    const { bid_amount, property_id } = bidSchema.parse(body)
    const bidNote = body?.note || body?.message || undefined
    if (property_id && property_id !== propertyId) {
      throw new ValidationError('Property does not match bid payload')
    }

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    // Get property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      throw new NotFoundError('Property')
    }

    if (property.listing_type !== 'sale') {
      throw new ValidationError('Bidding is only available for sale listings')
    }

    if (property.verification_status !== 'verified') {
      throw new ValidationError('Property must be verified before accepting bids')
    }

    // Validate bid amount
    const minimumPrice = property.minimum_price || property.asking_price || 0
    if (bid_amount < minimumPrice) {
      return NextResponse.json({
        status: 'auto_rejected',
        reason: 'Below minimum acceptable price',
        minimum_price: minimumPrice,
      })
    }

    const { data: bid, error: bidError } = await adminSupabase
      .from('bids')
      .insert({
        property_id: propertyId,
        buyer_id: buyer.id,
        amount: bid_amount,
        status: 'pending',
        message: bidNote || null,
      })
      .select()
      .single()

    if (bidError || !bid) {
      throw new ValidationError(bidError?.message || 'Failed to submit bid')
    }

    // Send notifications using helper (before response)
    try {
      const { notificationHelpers } = await import('@/lib/services/notification-helper')
      const buyerName = buyer.full_name || buyer.email || 'Buyer'
      await notificationHelpers.newBid({
        developerId: property.developer_id,
        propertyId: property.id,
        propertyTitle: property.title,
        bidId: bid.id,
        bidAmount: bid_amount,
        bidNote,
        buyerId: buyer.id,
        buyerName,
      })
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError)
    }

    return NextResponse.json(
      {
        message: 'Bid submitted successfully',
        bid_amount,
        status: 'pending',
        bid,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

