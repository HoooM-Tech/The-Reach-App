import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * DELETE /api/buyer/account
 * Deletes the authenticated buyer's account (user record and auth user).
 * Irreversible; caller should confirm first.
 */
export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createAdminSupabaseClient();

    // Delete auth user (this will cascade or we need to handle related data per policy)
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(currentUser.id);

    if (authError) {
      console.error('Delete user auth error:', authError);
      return NextResponse.json(
        { success: false, error: authError.message || 'Failed to delete account' },
        { status: 400 }
      );
    }

    // Optionally soft-delete or remove user row if not cascade
    await adminSupabase.from('users').delete().eq('id', currentUser.id);

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
