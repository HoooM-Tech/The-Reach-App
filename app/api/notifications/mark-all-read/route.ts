import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const supabase = createServerSupabaseClient()

    // Mark all user's notifications as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json({
      message: 'All notifications marked as read',
      success: true,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
