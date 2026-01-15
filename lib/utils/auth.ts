import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { AuthenticationError, AuthorizationError } from './errors'

export async function getAuthenticatedUser() {
  // Check for Bearer token in Authorization header
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  
  // If Bearer token is provided, use it
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new AuthenticationError('Missing Supabase configuration')
    }
    
    try {
      // Create a client and verify the token with timeout
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      
      // Add timeout to prevent hanging on network issues
      const getUserPromise = client.auth.getUser(token)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token validation timeout')), 5000)
      )
      
      const { data: { user: authUser }, error: authError } = await Promise.race([
        getUserPromise,
        timeoutPromise,
      ]) as any
      
      if (authError || !authUser) {
        throw new AuthenticationError('Session expired. Please log in again.')
      }
      
      // Get user from database using admin client to bypass RLS
      const adminSupabase = createAdminSupabaseClient()
      const { data: user, error: dbError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (dbError || !user) {
        throw new AuthenticationError('User not found in database')
      }

      return user
    } catch (error: any) {
      // If token validation fails due to network/timeout, try to extract user ID from token directly
      // JWT tokens can be decoded without network call (though we can't verify signature)
      if (error.message?.includes('timeout') || error.message?.includes('Connect Timeout')) {
        console.warn('Token validation timeout, attempting fallback authentication')
        // Try cookie-based session as fallback
        const supabase = createServerSupabaseClient()
        const { data: { session: cookieSession } } = await supabase.auth.getSession()
        
        if (cookieSession?.user) {
          const adminSupabase = createAdminSupabaseClient()
          const { data: user } = await adminSupabase
            .from('users')
            .select('*')
            .eq('id', cookieSession.user.id)
            .single()
          
          if (user) {
            return user
          }
        }
      }
      throw new AuthenticationError(error.message || 'Authentication failed')
    }
  }

  // Fallback to cookie-based session
  const supabase = createServerSupabaseClient()
  const {
    data: { session: cookieSession },
  } = await supabase.auth.getSession()

  if (!cookieSession) {
    throw new AuthenticationError('No authentication provided')
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', cookieSession.user.id)
    .single()

  if (error || !user) {
    throw new AuthenticationError('User not found')
  }

  return user
}

export async function requireRole(requiredRole: string | string[]) {
  const user = await getAuthenticatedUser()
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  if (!roles.includes(user.role)) {
    throw new AuthorizationError(`Required role: ${roles.join(' or ')}`)
  }

  return user
}

export async function requireAdmin() {
  return requireRole('admin')
}

export async function requireDeveloper() {
  return requireRole(['developer', 'admin'])
}

export async function requireCreator() {
  return requireRole(['creator', 'admin'])
}

