import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const userId = params.userId

    // Verify access
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    // Use admin client since we've already verified user access
    // This bypasses RLS which might be blocking the query
    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // Normalize field names: database uses 'read', frontend expects 'is_read'
    const normalizedNotifications = (notifications || []).map((n: any) => ({
      ...n,
      is_read: n.read ?? false,
      message: n.body || n.message || '',
    }))

    return NextResponse.json({
      notifications: normalizedNotifications,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

