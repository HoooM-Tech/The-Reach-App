import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
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
    const { bid_amount } = bidSchema.parse(body)

    const supabase = createServerSupabaseClient()

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

    // Store bid (you might want a separate bids table)
    // For now, we'll just return success
    // In production, you'd create a bids table and store the bid

    return NextResponse.json(
      {
        message: 'Bid submitted successfully',
        bid_amount,
        status: 'pending',
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

