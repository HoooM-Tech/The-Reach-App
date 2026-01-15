import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const user = await getAuthenticatedUser()
    const notificationId = params.notificationId
    const supabase = createServerSupabaseClient()

    // Verify ownership
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (notifError || !notification) {
      throw new NotFoundError('Notification')
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json({
      message: 'Notification marked as read',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

