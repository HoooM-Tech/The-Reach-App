import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check for Authorization header (Bearer token) - case insensitive
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  let hasValidAuth = false
  let hasAuthHeader = false

  if (authHeader?.startsWith('Bearer ') || authHeader?.startsWith('bearer ')) {
    hasAuthHeader = true
    const token = authHeader.substring(7).trim()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (supabaseUrl && supabaseAnonKey && token) {
      try {
        // Verify the token with a timeout to prevent blocking on network issues
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
        
        // Use Promise.race to add timeout
        const validationPromise = client.auth.getUser(token)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Token validation timeout')), 3000)
        )
        
        try {
          const { data: { user }, error } = await Promise.race([
            validationPromise,
            timeoutPromise,
          ]) as any
          
          if (user && !error) {
            hasValidAuth = true
          }
        } catch (timeoutErr) {
          // Timeout or validation error - don't block, let API route handle it
          console.warn('Token validation timeout/error in middleware, allowing request to proceed:', timeoutErr)
        }
      } catch (err) {
        // Token validation failed, but we'll allow the request through
        // The API route will handle proper validation
        console.warn('Token validation exception in middleware, allowing request:', err)
      }
    }
  }

  // Get session from cookies (for cookie-based auth)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Public API routes that don't require auth
    const publicRoutes = [
      '/api/auth/signup',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/verify-otp',
      '/api/auth/google',
      '/api/auth/test-token', // Debug endpoint
      '/api/tracking',
      '/api/properties/browse',
      '/api/properties/verified',
      '/api/leads/submit', // Allow public lead submission
    ]

    // Special handling for property detail routes (allow public access)
    const isPropertyDetailRoute = /^\/api\/properties\/[^/]+$/.test(req.nextUrl.pathname)
    
    const isPublicRoute = publicRoutes.some((route) =>
      req.nextUrl.pathname.startsWith(route)
    ) || isPropertyDetailRoute

    // Allow if it's a public route, or if there's a session, or if there's a valid Bearer token
    // Also allow if there's an auth header (even if validation failed) - let the API route handle validation
    // This prevents blocking requests that might have valid tokens that just failed validation due to network issues
    if (!isPublicRoute && !session && !hasValidAuth && !hasAuthHeader) {
      // Only block if there's no auth header at all
      // If there's an auth header, let the API route handle validation (it might be a valid token)
      const debugInfo = {
        path: req.nextUrl.pathname,
        hasAuthHeader,
        hasSession: !!session,
        hasValidAuth,
        isPublicRoute,
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Blocked request (no auth):', debugInfo)
      }
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
      }, { status: 401 })
    }

    // Log wallet API requests for debugging
    if (req.nextUrl.pathname.startsWith('/api/wallet/') && process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Allowing wallet API request:', {
        path: req.nextUrl.pathname,
        hasAuthHeader,
        hasSession: !!session,
        hasValidAuth,
      })
    }

    // Admin routes
    if (req.nextUrl.pathname.startsWith('/api/admin')) {
      // Check for session or Bearer token
      let userId: string | null = null
      
      if (session?.user?.id) {
        userId = session.user.id
      } else if (hasValidAuth && authHeader) {
        // Extract user ID from token if Bearer token is valid
        const token = authHeader.substring(7).trim()
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const client = createClient(supabaseUrl, supabaseAnonKey)
        const { data: { user: tokenUser } } = await client.auth.getUser(token)
        if (tokenUser) {
          userId = tokenUser.id
        }
      }

      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get user role from database using admin client
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        }
      )
      
      const { data: user } = await adminSupabase
        .from('users')
        .select('role')
        .eq('id', userId)
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
    '/properties/create',
    '/wallet/:path*',
    '/creator/promote/:path*',
  ],
}

