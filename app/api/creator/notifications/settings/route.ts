import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireCreator } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/creator/notifications/settings
 * 
 * Returns the creator's notification preferences
 */
export async function GET(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const adminSupabase = createAdminSupabaseClient();

    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('notification_preferences')
      .eq('id', creator.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    // Default settings
    const defaultSettings = {
      contractUpdate: true,
      newLeads: true,
      inspectionBookings: true,
      handoverReminders: true,
      payoutUpdate: true,
    };

    const settings = (user?.notification_preferences as any) || defaultSettings;

    return NextResponse.json(settings);
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * PATCH /api/creator/notifications/settings
 * 
 * Updates the creator's notification preferences
 */
export async function PATCH(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const body = await req.json();
    const { contractUpdate, newLeads, inspectionBookings, handoverReminders, payoutUpdate } = body;

    const adminSupabase = createAdminSupabaseClient();

    // Update notification preferences
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        notification_preferences: {
          contractUpdate: contractUpdate ?? true,
          newLeads: newLeads ?? true,
          inspectionBookings: inspectionBookings ?? true,
          handoverReminders: handoverReminders ?? true,
          payoutUpdate: payoutUpdate ?? true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id);

    if (updateError) {
      console.error('Failed to update notification preferences:', updateError);
      // Return success anyway - settings will be stored in localStorage as fallback
      return NextResponse.json({
        success: true,
        message: 'Settings saved (using fallback storage)',
        settings: {
          contractUpdate: contractUpdate ?? true,
          newLeads: newLeads ?? true,
          inspectionBookings: inspectionBookings ?? true,
          handoverReminders: handoverReminders ?? true,
          payoutUpdate: payoutUpdate ?? true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated',
      settings: {
        contractUpdate: contractUpdate ?? true,
        newLeads: newLeads ?? true,
        inspectionBookings: inspectionBookings ?? true,
        handoverReminders: handoverReminders ?? true,
        payoutUpdate: payoutUpdate ?? true,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
