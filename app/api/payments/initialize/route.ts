import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { initializePayment } from '@/lib/services/paystack'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const paymentSchema = z.object({
  property_id: z.string().uuid(),
  amount: z.number().positive(),
  callback_url: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await paymentSchema.parse(await req.json())
    const supabase = createServerSupabaseClient()

    // Verify property exists and is verified
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', body.property_id)
      .single()

    if (propertyError || !property) {
      throw new NotFoundError('Property')
    }

    if (property.verification_status !== 'verified') {
      throw new ValidationError('Property must be verified before payment')
    }

    // Verify amount matches asking price (or is within acceptable range for bidding)
    if (property.listing_type === 'sale') {
      if (body.amount < (property.minimum_price || property.asking_price || 0)) {
        throw new ValidationError('Amount is below minimum acceptable price')
      }
    }

    // Generate payment reference
    const reference = `REACH_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Initialize payment with Paystack
    const paymentData = await initializePayment({
      email: user.email,
      amount: body.amount * 100, // Convert to kobo
      reference,
      metadata: {
        property_id: body.property_id,
        buyer_id: user.id,
        developer_id: property.developer_id,
      },
      callback_url: body.callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
    })

    return NextResponse.json({
      message: 'Payment initialized',
      authorization_url: paymentData.data.authorization_url,
      reference: paymentData.data.reference,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

