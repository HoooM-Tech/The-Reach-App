import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AuthenticationError, AuthorizationError } from './errors'

/**
 * Get authenticated user from cookies (for API routes)
 * Uses route handler client which properly handles cookies in API routes
 */
export async function getAuthenticatedUserFromRequest(req?: NextRequest, res?: NextResponse) {
  if (req && res) {
    // Use route handler client for API routes
    const supabase = createRouteHandlerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      // Fallback: Check for Bearer token in Authorization header
      const authHeader = req.headers.get('authorization')
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null

      if (bearerToken) {
        const { data: { user: verifiedUser }, error: verifiedError } = await supabase.auth.getUser(bearerToken)
        
        if (verifiedError || !verifiedUser) {
          throw new AuthenticationError('Session expired. Please log in again.')
        }

        const adminSupabase = createAdminSupabaseClient()
        const { data: user, error: dbError } = await adminSupabase
          .from('users')
          .select('*')
          .eq('id', verifiedUser.id)
          .single()

        if (dbError || !user) {
          throw new AuthenticationError('User not found in database')
        }

        return user
      }

      throw new AuthenticationError('No authentication provided')
    }

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
  }
  
  // Fallback to server component client if no request/response provided
  return getAuthenticatedUser()
}

export async function getAuthenticatedUser() {
  // Use Supabase SSR server client - it handles cookies automatically
  const supabase = createServerSupabaseClient()
  
  // Use getUser() instead of getSession() for security - verifies token with Supabase Auth server
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    // Fallback: Check for Bearer token in Authorization header
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null

    if (bearerToken) {
      // Verify bearer token
      const { data: { user: verifiedUser }, error: verifiedError } = await supabase.auth.getUser(bearerToken)
      
      if (verifiedError || !verifiedUser) {
        throw new AuthenticationError('Session expired. Please log in again.')
      }

      // Get user from database using admin client to bypass RLS
      const adminSupabase = createAdminSupabaseClient()
      const { data: user, error: dbError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', verifiedUser.id)
        .single()

      if (dbError || !user) {
        throw new AuthenticationError('User not found in database')
      }

      return user
    }

    throw new AuthenticationError('No authentication provided')
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

export async function requireBuyer() {
  return requireRole('buyer')
}

