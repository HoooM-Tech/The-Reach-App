import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { ValidationError, handleError } from '@/lib/utils/errors';

/**
 * POST /api/buyer/password/reset
 * Body: { email: string, resetCode: string, newPassword: string }
 * Verifies code and updates password. User must be buyer (optional: allow only for own email).
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, resetCode, newPassword } = body;

    if (!email || !resetCode || !newPassword) {
      throw new ValidationError('All fields are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new ValidationError('Password must include uppercase, lowercase, and a number');
    }

    if (resetCode.length !== 6) {
      throw new ValidationError('Invalid reset code');
    }

    // Optional: ensure reset is for current user's email
    if (email.toLowerCase() !== currentUser.email?.toLowerCase()) {
      throw new ValidationError('Reset code was sent to a different email');
    }

    const adminSupabase = createAdminSupabaseClient();

    const { data: resetRequest, error: resetError } = await adminSupabase
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('code', resetCode)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resetError || !resetRequest) {
      throw new ValidationError('Invalid or expired reset code');
    }

    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      throw new ValidationError('User not found');
    }

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    await adminSupabase.from('users').update({ updated_at: new Date().toISOString() }).eq('id', user.id);
    await adminSupabase.from('password_resets').update({ used: true }).eq('id', resetRequest.id);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
