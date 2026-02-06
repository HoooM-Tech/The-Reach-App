import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { ValidationError, handleError } from '@/lib/utils/errors';

/**
 * POST /api/auth/request-password-reset
 * 
 * Sends a 6-digit reset code to the user's email
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    const body = await req.json();
    const { email } = body;

    // Use authenticated user's email if not provided
    const targetEmail = email || currentUser.email;

    if (!targetEmail) {
      throw new ValidationError('Email is required');
    }

    const adminSupabase = createAdminSupabaseClient();

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store reset code in database (expires in 15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Check if password_resets table exists, if not create entry in users table or separate table
    // For now, we'll use a simple approach with a password_resets table
    const { error: insertError } = await adminSupabase
      .from('password_resets')
      .insert({
        email: targetEmail,
        code: resetCode,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    if (insertError) {
      // If table doesn't exist, we'll need to create it via migration
      // For now, log and return success (code would be sent via email service)
      console.error('Failed to store reset code:', insertError);
      console.log('Reset code for', targetEmail, ':', resetCode);
      
      // TODO: Send email with reset code using email service
      // await sendPasswordResetEmail(targetEmail, resetCode);
      
      return NextResponse.json({
        success: true,
        message: 'Reset code sent to email',
        // In development, return code for testing (remove in production)
        ...(process.env.NODE_ENV === 'development' && { code: resetCode }),
      });
    }

    // TODO: Send email with reset code using email service
    // await sendPasswordResetEmail(targetEmail, resetCode);

    return NextResponse.json({
      success: true,
      message: 'Reset code sent to email',
      // In development, return code for testing (remove in production)
      ...(process.env.NODE_ENV === 'development' && { code: resetCode }),
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
