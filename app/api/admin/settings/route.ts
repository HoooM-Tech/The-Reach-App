import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();

    const { data: settings, error } = await adminSupabase
      .from('platform_settings')
      .select('*');

    if (error) {
      throw error;
    }

    // Transform settings array to object
    const settingsObj: any = {};
    settings?.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      const { error: updateError } = await adminSupabase
        .from('platform_settings')
        .update({
          value: value,
          updated_by: admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key);

      if (updateError) {
        console.error(`Failed to update setting ${key}:`, updateError);
      }
    }

    // Log admin action
    await adminSupabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'settings_updated',
      entity: 'platform_settings',
      entity_id: null,
      details: { updated_keys: Object.keys(settings) },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
