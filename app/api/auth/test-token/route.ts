import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Debug endpoint - disable in production
export async function GET(req: NextRequest) {
  // Disable in production for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 404 }
    )
  }
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    const debug = {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? (authHeader.substring(0, 20) + '...') : null,
      isBearer: authHeader?.startsWith('Bearer '),
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'No Bearer token found',
        debug,
        instructions: 'Add Authorization header: Bearer <your-token>'
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        error: 'Missing Supabase environment variables',
        debug
      }, { status: 500 })
    }

    const client = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await client.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({
        error: 'Session expired. Please log in again.',
        tokenError: error?.message,
        debug
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      debug
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      message: error.message,
    }, { status: 500 })
  }
}

