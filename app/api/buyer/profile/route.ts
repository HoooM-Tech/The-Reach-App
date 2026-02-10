import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { uploadFile } from '@/lib/utils/file-upload';
import { normalizeNigerianPhone } from '@/lib/utils/phone';
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors';

/**
 * GET /api/buyer/profile
 * Returns the authenticated buyer's profile (role must be buyer).
 */
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createAdminSupabaseClient();
    const { data: user, error } = await adminSupabase
      .from('users')
      .select('id, email, phone, full_name, avatar_url, created_at, updated_at')
      .eq('id', currentUser.id)
      .single();

    if (error || !user) {
      throw new NotFoundError('Profile');
    }

    return NextResponse.json({
      buyer: {
        id: user.id,
        fullName: user.full_name || '',
        email: user.email || '',
        phoneNumber: user.phone || '',
        profilePicture: user.avatar_url || undefined,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * PATCH /api/buyer/profile
 * Updates buyer profile. Accepts JSON or FormData (for profile picture upload).
 */
export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== 'buyer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    const adminSupabase = createAdminSupabaseClient();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const fullName = formData.get('fullName') as string | null;
      const email = formData.get('email') as string | null;
      const phoneNumber = formData.get('phoneNumber') as string | null;
      const profilePicture = formData.get('profilePicture') as File | null;

      if (fullName != null) updateData.full_name = fullName;
      if (email != null && email !== currentUser.email) {
        throw new ValidationError('Email cannot be changed via profile update');
      }
      if (phoneNumber != null) {
        try {
          updateData.phone = normalizeNigerianPhone(phoneNumber);
        } catch {
          throw new ValidationError('Invalid phone number format');
        }
      }

      if (profilePicture && profilePicture.size > 0) {
        if (profilePicture.size > 5 * 1024 * 1024) {
          throw new ValidationError('Image size must be less than 5MB');
        }
        if (!profilePicture.type.startsWith('image/')) {
          throw new ValidationError('Please upload an image file');
        }
        const fileUrl = await uploadFile(
          profilePicture,
          'image',
          currentUser.id,
          'property-media'
        );
        updateData.avatar_url = fileUrl;
      }
    } else {
      const body = await req.json();
      if (body.fullName != null) updateData.full_name = body.fullName;
      if (body.email != null && body.email !== currentUser.email) {
        throw new ValidationError('Email cannot be changed via profile update');
      }
      if (body.phoneNumber != null) {
        try {
          updateData.phone = normalizeNigerianPhone(body.phoneNumber);
        } catch {
          throw new ValidationError('Invalid phone number format');
        }
      }
      if (body.profilePicture != null) updateData.avatar_url = body.profilePicture;
    }

    const { data: updated, error } = await adminSupabase
      .from('users')
      .update(updateData)
      .eq('id', currentUser.id)
      .select('id, email, phone, full_name, avatar_url, created_at, updated_at')
      .single();

    if (error) throw new ValidationError(error.message);
    if (!updated) throw new NotFoundError('Profile');

    return NextResponse.json({
      success: true,
      buyer: {
        id: updated.id,
        fullName: updated.full_name || '',
        email: updated.email || '',
        phoneNumber: updated.phone || '',
        profilePicture: updated.avatar_url || undefined,
        createdAt: updated.created_at,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
