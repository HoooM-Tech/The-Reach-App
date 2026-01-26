import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * POST /api/creator/promotions/[id]/resume
 * 
 * Resumes a paused or expired promotion
 * State transition: paused | expired → active
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const creator = await requireCreator();
    const { id } = await Promise.resolve(params);
    const supabase = createAdminSupabaseClient();

    // Get current promotion state
    const { data: existingLink, error: checkError } = await supabase
      .from('tracking_links')
      .select('id, creator_id, status, expires_at')
      .eq('id', id)
      .eq('creator_id', creator.id)
      .single();

    if (checkError || !existingLink) {
      throw new NotFoundError('Promotion');
    }

    // Validate state transition: only paused or expired promotions can be resumed
    if (existingLink.status !== 'paused' && existingLink.status !== 'expired') {
      throw new ValidationError(
        `Cannot resume promotion. Current status is "${existingLink.status}". Only paused or expired promotions can be resumed.`
      );
    }

    // Check if expired promotion can be resumed (must extend expiry if expired)
    if (existingLink.status === 'expired' && existingLink.expires_at) {
      const now = new Date();
      const expiresAt = new Date(existingLink.expires_at);
      if (expiresAt < now) {
        // Promotion is expired - user needs to extend expiry first
        throw new ValidationError(
          'Cannot resume expired promotion. Please extend the expiration date first.'
        );
      }
    }

    // Update status to active and clear paused_at
    const updateData: any = {
      status: 'active',
      paused_at: null,
      expired_at: null,
    };

    const { data: updatedLink, error: updateError } = await supabase
      .from('tracking_links')
      .update(updateData)
      .eq('id', id)
      .select('id, status')
      .single();

    // If update failed due to missing updated_at column, try without it
    if (updateError && updateError.message?.includes('updated_at')) {
      const { data: retryLink, error: retryError } = await supabase
        .from('tracking_links')
        .update(updateData)
        .eq('id', id)
        .select('id, status')
        .single();
      
      if (retryError) {
        throw new ValidationError(retryError.message);
      }
      
      const finalLink = retryLink;
      if (finalLink) {
        console.log('[Promotion Lifecycle]', {
          promotion_id: id,
          creator_id: creator.id,
          previous_status: existingLink.status,
          new_status: 'active',
          timestamp: new Date().toISOString(),
          action: 'resume',
        });

        return NextResponse.json({
          message: 'Promotion resumed successfully',
          promotion: {
            id: finalLink.id,
            status: finalLink.status,
          },
        });
      }
    }

    if (updateError && !updateError.message?.includes('updated_at')) {
      throw new ValidationError(updateError.message);
    }

    if (!updatedLink) {
      throw new ValidationError('Failed to update promotion status');
    }

    // Log state change
    console.log('[Promotion Lifecycle]', {
      promotion_id: id,
      creator_id: creator.id,
      previous_status: existingLink.status,
      new_status: 'active',
      timestamp: new Date().toISOString(),
      action: 'resume',
    });

    return NextResponse.json({
      message: 'Promotion resumed successfully',
      promotion: {
        id: updatedLink.id,
        status: updatedLink.status,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
