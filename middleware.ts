// middleware.ts
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl
  
  // CRITICAL: Exclude public routes FIRST - these skip ALL auth checks
  const publicPaths = [
    '/',
    '/login',
    '/role-selection',
    '/auth/login', // redirect route
  ]
  
  const publicPathPrefixes = [
    '/auth/',
    '/property/',
    '/api/public/',
    '/api/auth/',
    '/api/tracking',
    '/api/properties/browse',
    '/api/properties/verified',
    '/api/leads/submit',
  ]
  
  // Check exact path matches
  if (publicPaths.includes(pathname)) {
    return res
  }
  
  // Check prefix matches
  const isPublicRoute = publicPathPrefixes.some(prefix => pathname.startsWith(prefix))
  if (isPublicRoute) {
    return res
  }

  // Create Supabase client
  const supabase = createMiddlewareClient(req, res)
  
  // Get user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  const hasValidSession = !!authUser && !authError

  // Protect /dashboard/* routes
  if (pathname.startsWith('/dashboard/')) {
    if (!hasValidSession) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return res
  }

  // Protect /admin/* routes
  if (pathname.startsWith('/admin/')) {
    if (!hasValidSession) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Check admin role
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    const { data: user } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (!user || user.role !== 'admin') {
      if (user?.role) {
        return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url))
      }
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return res
  }

  // Protect API routes
  if (pathname.startsWith('/api/')) {
    if (!hasValidSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (pathname.startsWith('/api/admin')) {
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      
      const { data: user } = await adminSupabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/properties/create',
    '/wallet/:path*',
    '/creator/promote/:path*',
  ],
}