import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const rateLimitResult = checkRateLimit(`login:${clientIP}`, 5, 900000) // 5 attempts per 15 minutes (900000ms)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // Provide more detailed error message
      const errorMessage = authError.message || 'Invalid email or password'
      
      // Check if user exists in database but not in auth
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single()

      if (dbUser && !authData?.user) {
        throw new ValidationError(
          'User exists in database but authentication failed. ' +
          'The user may need to be created in Supabase Auth or email confirmation may be required. ' +
          `Error: ${errorMessage}`
        )
      }

      throw new ValidationError(errorMessage)
    }

    if (!authData.user) {
      throw new ValidationError('Login failed')
    }

    // Get user data from database using admin client to bypass RLS
    const adminSupabase = createAdminSupabaseClient()
    let { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    // If user doesn't exist in database, create it from auth metadata
    if (userError || !user) {
      // Check if user exists by email (in case ID mismatch)
      const { data: existingUserByEmail } = await adminSupabase
        .from('users')
        .select('*')
        .eq('email', authData.user.email || '')
        .single()

      if (existingUserByEmail) {
        // User exists but with different ID - use existing user
        user = existingUserByEmail
      } else {
        // Get user metadata from auth
        const userMetadata = authData.user.user_metadata || {}
        const email = authData.user.email || ''
        
        // Determine role from metadata or default to 'buyer'
        const role = userMetadata.role || 'buyer'
        
        // Use upsert to handle potential race conditions
        const { data: newUser, error: createError } = await adminSupabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: email,
            phone: authData.user.phone || userMetadata.phone || null,
            full_name: userMetadata.full_name || email.split('@')[0],
            role: role,
            tier: userMetadata.tier || (role === 'creator' ? 1 : null),
            kyc_status: 'pending',
          }, {
            onConflict: 'id',
          })
          .select()
          .single()

        if (createError || !newUser) {
          // If still fails, try to get the user one more time (might have been created by another request)
          const { data: retryUser } = await adminSupabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single()

          if (retryUser) {
            user = retryUser
          } else {
            throw new ValidationError(
              `User authenticated but failed to create database record: ${createError?.message || 'Unknown error'}`
            )
          }
        } else {
          user = newUser
        }

        // Create wallet for buyers if it doesn't exist
        if (user && role === 'buyer') {
          const { data: existingWallet } = await adminSupabase
            .from('wallets')
            .select('id')
            .eq('user_id', user.id)
            .single()

          if (!existingWallet) {
            await adminSupabase.from('wallets').insert({
              user_id: user.id,
              balance: 0,
              locked_balance: 0,
            })
          }
        }
      }
    }

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
      session: authData.session,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

