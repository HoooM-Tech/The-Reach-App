import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get server-side Supabase client - Supabase SSR handles cookies automatically
  const supabase = createServerSupabaseClient()
  
  // Use getUser() instead of getSession() for security - verifies token with Supabase Auth server
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  // If no authenticated user, redirect to login
  if (authError || !authUser) {
    redirect('/login?redirect=/dashboard/admin')
  }

  // Get user from database to check role (use admin client to bypass RLS)
  const adminSupabase = createAdminSupabaseClient()
  const { data: user, error } = await adminSupabase
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  // If user not found or not admin, redirect
  if (error || !user) {
    redirect('/login?redirect=/dashboard/admin')
  }

  if (user.role !== 'admin') {
    // If user exists but not admin, redirect to their dashboard
    redirect(`/dashboard/${user.role}`)
  }

  // User is authenticated and is admin - render children
  return <>{children}</>
}
