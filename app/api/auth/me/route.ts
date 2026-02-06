import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    // Use Supabase SSR route handler client - it reads cookies automatically
    const supabase = createRouteHandlerClient()
    
    // Use getUser() instead of getSession() for security - verifies token with Supabase Auth server
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user from database using admin client to bypass RLS
    const adminSupabase = createAdminSupabaseClient()
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email, full_name, role, tier, kyc_status')
      .eq('id', authUser.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
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
