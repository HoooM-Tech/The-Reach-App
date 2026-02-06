import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { ValidationError, handleError } from '@/lib/utils/errors';

/**
 * POST /api/auth/reset-password
 * 
 * Verifies reset code and updates password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, newPassword, confirmPassword } = body;

    if (!email || !code || !newPassword || !confirmPassword) {
      throw new ValidationError('All fields are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new ValidationError('Password must include uppercase, lowercase, and a number');
    }

    if (newPassword !== confirmPassword) {
      throw new ValidationError('Passwords do not match');
    }

    if (code.length !== 6) {
      throw new ValidationError('Invalid reset code');
    }

    const adminSupabase = createAdminSupabaseClient();

    // Verify reset code
    const { data: resetRequest, error: resetError } = await adminSupabase
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resetError || !resetRequest) {
      throw new ValidationError('Invalid or expired reset code');
    }

    // Get user from database to get their ID
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      throw new ValidationError('User not found');
    }

    // Update password using Supabase Auth Admin API
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Update updated_at in users table
    await adminSupabase
      .from('users')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Mark reset code as used
    await adminSupabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetRequest.id);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
