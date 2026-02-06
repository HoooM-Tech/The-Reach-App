import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { normalizeNigerianPhone } from '@/lib/utils/phone'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { z } from 'zod'

const verifyOtpSchema = z.object({
  phone: z.string(),
  otp: z.string().length(6),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, otp } = verifyOtpSchema.parse(body)
    
    // Rate limiting: 10 OTP attempts per 15 minutes per phone number
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeNigerianPhone(phone);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : 'Invalid phone number format');
    }
    const rateLimitResult = checkRateLimit(`otp:${normalizedPhone}`, 10, 900000) // 10 attempts per 15 minutes (900000ms)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many OTP verification attempts. Please request a new OTP.' },
        { status: 429 }
      )
    }

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    // Find and verify OTP
    const { data: otpRecord, error: otpError } = await adminSupabase
      .from('otps')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('code', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpRecord) {
      throw new ValidationError('Invalid OTP')
    }

    // Mark OTP as verified
    await adminSupabase
      .from('otps')
      .update({ verified: true })
      .eq('id', otpRecord.id)

    // Find user by phone
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('phone', normalizedPhone)
      .single()

    if (userError || !user) {
      throw new ValidationError('User not found')
    }

    // Update user KYC status
    await adminSupabase
      .from('users')
      .update({ kyc_status: 'verified' })
      .eq('id', user.id)

    // Return user data - frontend will handle login separately
    return NextResponse.json({
      message: 'OTP verified successfully',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
        kyc_status: 'verified',
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

