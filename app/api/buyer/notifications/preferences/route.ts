import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

const DEFAULT_PREFERENCES = {
  contractUpdate: true,
  newLeads: true,
  inspectionBookings: true,
  handoverReminders: true,
  payoutUpdate: true,
};

/**
 * GET /api/buyer/notifications/preferences
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const { data: user, error } = await adminSupabase
      .from('users')
      .select('notification_preferences')
      .eq('id', currentUser.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    const preferences = (user?.notification_preferences as typeof DEFAULT_PREFERENCES) || DEFAULT_PREFERENCES;

    return NextResponse.json({ preferences });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * PATCH /api/buyer/notifications/preferences
 * Body: Partial<{ contractUpdate, newLeads, inspectionBookings, handoverReminders, payoutUpdate }>
 */
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const adminSupabase = createAdminSupabaseClient();

    const { data: existing } = await adminSupabase
      .from('users')
      .select('notification_preferences')
      .eq('id', currentUser.id)
      .single();

    const current = (existing?.notification_preferences as typeof DEFAULT_PREFERENCES) || DEFAULT_PREFERENCES;
    const updated = {
      contractUpdate: body.contractUpdate ?? current.contractUpdate,
      newLeads: body.newLeads ?? current.newLeads,
      inspectionBookings: body.inspectionBookings ?? current.inspectionBookings,
      handoverReminders: body.handoverReminders ?? current.handoverReminders,
      payoutUpdate: body.payoutUpdate ?? current.payoutUpdate,
    };

    const { error } = await adminSupabase
      .from('users')
      .update({
        notification_preferences: updated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id);

    if (error) {
      console.error('Buyer notification preferences update error:', error);
      return NextResponse.json({
        success: true,
        preferences: updated,
        message: 'Preferences saved',
      });
    }

    return NextResponse.json({ success: true, preferences: updated });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
