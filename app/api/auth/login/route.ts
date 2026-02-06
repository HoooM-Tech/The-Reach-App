// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const rateLimitResult = checkRateLimit(`login:${clientIP}`, 5, 900000)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    // Create Supabase client
    const supabase = createRouteHandlerClient()

    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      throw new ValidationError(authError?.message || 'Invalid email or password')
    }

    // Get/create user in database
    const adminSupabase = createAdminSupabaseClient()
    let { data: user } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    // Create user if doesn't exist
    if (!user) {
      const userMetadata = authData.user.user_metadata || {}
      const role = userMetadata.role || 'buyer'
      
      const { data: newUser } = await adminSupabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          phone: authData.user.phone || userMetadata.phone || null,
          full_name: userMetadata.full_name || authData.user.email!.split('@')[0],
          role: role,
          tier: userMetadata.tier ?? null,
          kyc_status: 'pending',
        })
        .select()
        .single()

      user = newUser!

      // Create wallet for buyers
      if (role === 'buyer') {
        await adminSupabase.from('wallets').insert({
          user_id: user.id,
          balance: 0,
          locked_balance: 0,
        })
      }
    }

    // Return success - cookies are set automatically by Supabase
    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tier: user.tier,
        kyc_status: user.kyc_status,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}