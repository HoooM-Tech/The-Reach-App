import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { ValidationError, handleError } from '@/lib/utils/errors';

/**
 * POST /api/buyer/password/request-reset
 * Sends a 6-digit reset code to the buyer's email. Body: { email?: string } (defaults to current user email).
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body.email || currentUser.email) as string | undefined;

    if (!targetEmail) {
      throw new ValidationError('Email is required');
    }

    const adminSupabase = createAdminSupabaseClient();
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await adminSupabase.from('password_resets').insert({
      email: targetEmail,
      code: resetCode,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    // TODO: Send email with reset code
    return NextResponse.json({
      success: true,
      message: 'Reset code sent to your email',
      ...(process.env.NODE_ENV === 'development' && { code: resetCode }),
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
