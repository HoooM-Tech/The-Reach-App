import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const resolvedParams = await Promise.resolve(params);
    const propertyId = resolvedParams.id;
    const body = await req.json();

    if (!body.reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Update property verification status
    const { error: updateError } = await adminSupabase
      .from('properties')
      .update({
        verification_status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    if (updateError) {
      throw updateError;
    }

    // Log admin action
    await adminSupabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'property_rejected',
      entity: 'property',
      entity_id: propertyId,
      details: { reason: body.reason, feedback: body.feedback || '' },
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

    // TODO: Send notification to developer about rejection

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
