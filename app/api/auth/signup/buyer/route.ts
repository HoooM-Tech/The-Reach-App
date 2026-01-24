import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/client'
import { sendOTP } from '@/lib/services/termii'
import { normalizeNigerianPhone } from '@/lib/utils/phone'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { rateLimit } from '@/lib/utils/rate-limit'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  full_name: z.string().min(2),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 signups per hour per IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const rateLimitResult = await rateLimit(`signup:${clientIP}`, 3, 3600) // 3 signups per hour
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const validated = signupSchema.parse(body)

    // Normalize phone number to E.164 format
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeNigerianPhone(validated.phone);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : 'Invalid phone number format');
    }

    const supabase = createAdminSupabaseClient()

    // Check if phone already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .single()

    if (existingUser) {
      throw new ValidationError('Phone number already registered')
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      phone: normalizedPhone,
    })

    if (authError) {
      throw new ValidationError(authError.message)
    }

    if (!authData.user) {
      throw new ValidationError('Failed to create user')
    }

    // Create user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: validated.email,
        phone: normalizedPhone,
        full_name: validated.full_name,
        role: 'buyer',
        kyc_status: 'pending',
      })
      .select()
      .single()

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new ValidationError(userError.message)
    }

    // Create wallet
    await supabase.from('wallets').insert({
      user_id: user.id,
      balance: 0,
      locked_balance: 0,
    })

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in database
    await supabase.from('otps').insert({
      phone: normalizedPhone,
      code: otp,
      expires_at: expiresAt.toISOString(),
      verified: false,
    })

    try {
      await sendOTP(normalizedPhone, otp)
    } catch (smsError) {
      console.error('Failed to send OTP:', smsError)
    }

    return NextResponse.json(
      {
        message: 'Buyer account created successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

