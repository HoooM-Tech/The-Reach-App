import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/notifications/unread-status
 * Returns whether user has any unread notifications
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = createAdminSupabaseClient();

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      hasUnread: (count || 0) > 0,
      unreadCount: count || 0,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
