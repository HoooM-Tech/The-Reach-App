import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const syncSchema = z.object({
  access_token: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { access_token } = syncSchema.parse(body)

    // Verify the token is valid
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new ValidationError('Server configuration error')
    }

    // Use route handler client - it will handle cookies automatically
    const supabase = createRouteHandlerClient()

    // Set the session using the access token
    // Supabase SSR will handle cookie management
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(access_token)

    if (authError || !authUser) {
      throw new ValidationError('Invalid or expired token')
    }

    // Get user profile
    const adminSupabase = createAdminSupabaseClient()
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, full_name, role, tier, kyc_status')
      .eq('id', authUser.id)
      .single()

    if (userError || !user) {
      throw new ValidationError('User not found')
    }

    // Create response with user data
    // Supabase SSR handles cookies automatically
    const response = NextResponse.json({
      message: 'Session synced successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tier: user.tier,
        kyc_status: user.kyc_status,
      },
    })

    console.log('[Sync Cookie API] Session synced for user:', user.email)

    return response
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
