import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { NotFoundError, handleError } from '@/lib/utils/errors';
import { notificationHelpers } from '@/lib/services/notification-helper';

export async function POST(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser();
    const inspectionId = params.inspectionId;

    const supabase = createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Get inspection
    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(developer_id, title)')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection');
    }

    // Only developers can confirm (buyers cannot)
    if (currentUser.role !== 'developer' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (currentUser.id !== inspection.properties?.developer_id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Valid transition: only booked or pending → confirmed
    const status = (inspection.status || '').toLowerCase();
    if (status !== 'booked' && status !== 'pending') {
      return NextResponse.json(
        { error: 'Inspection can only be confirmed when status is booked or pending' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update({
        status: 'confirmed',
        confirmed_at: now,
        confirmed_by: currentUser.id,
        updated_at: now,
      })
      .eq('id', inspectionId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to confirm inspection');
    }

    const property = inspection.properties as { developer_id?: string; title?: string } | null;
    const propertyTitle = property?.title ?? 'Property';

    // Notify buyer
    try {
      if (inspection.buyer_id) {
        await notificationHelpers.inspectionConfirmed({
          buyerId: inspection.buyer_id,
          propertyId: inspection.property_id,
          propertyTitle,
          inspectionId: inspectionId,
          slotTime: inspection.slot_time,
        });
      }
    } catch (notifError) {
      console.error('Failed to send inspection confirmation notification:', notifError);
    }

    // Notify admins
    try {
      const { data: admins } = await adminSupabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(10);

      if (admins?.length) {
        for (const admin of admins) {
          await notificationHelpers.inspectionConfirmedAdmin({
            adminId: admin.id,
            propertyId: inspection.property_id,
            propertyTitle,
            inspectionId,
            slotTime: inspection.slot_time,
            developerId: property?.developer_id,
            buyerId: inspection.buyer_id,
          });
        }
      }
    } catch (notifError) {
      console.error('Failed to send inspection confirmed (admin) notification:', notifError);
    }

    return NextResponse.json({
      message: 'Inspection confirmed successfully',
      inspection: updatedInspection,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
