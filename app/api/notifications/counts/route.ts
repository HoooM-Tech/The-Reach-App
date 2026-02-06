import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/notifications/counts
 * Returns badge counts for various notification types
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = createAdminSupabaseClient();

    // Get unread notification count
    const { count: notificationCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    // Get upcoming/pending inspection count
    const { count: inspectionCount } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'confirmed']);

    // Get pending handover count
    const { count: handoverCount } = await supabase
      .from('handovers')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'in_progress', 'documents_submitted']);

    return NextResponse.json({
      inspections: inspectionCount || 0,
      handovers: handoverCount || 0,
      notifications: notificationCount || 0,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
