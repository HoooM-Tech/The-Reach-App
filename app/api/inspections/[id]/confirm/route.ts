import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { NotFoundError, handleError } from '@/lib/utils/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser();
    const inspectionId = params.id;

    const supabase = createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Get inspection
    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(developer_id)')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection');
    }

    // Verify user is the developer
    if (currentUser.id !== inspection.properties?.developer_id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update inspection status to confirmed
    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inspectionId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to confirm inspection');
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
