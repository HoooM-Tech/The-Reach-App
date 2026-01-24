import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * POST /api/creator/promotions/[id]/stop
 * 
 * Stops a promotion permanently (irreversible)
 * State transition: active | paused → stopped
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
      .select('id, creator_id, status')
      .eq('id', id)
      .eq('creator_id', creator.id)
      .single();

    if (checkError || !existingLink) {
      throw new NotFoundError('Promotion');
    }

    // Validate state transition: only active or paused promotions can be stopped
    // Stopped and expired promotions cannot be stopped again
    if (existingLink.status === 'stopped') {
      throw new ValidationError('Promotion is already stopped. This action is irreversible.');
    }

    if (existingLink.status === 'expired') {
      throw new ValidationError('Cannot stop expired promotion. Please resume it first if needed.');
    }

    if (existingLink.status !== 'active' && existingLink.status !== 'paused') {
      throw new ValidationError(
        `Cannot stop promotion. Current status is "${existingLink.status}". Only active or paused promotions can be stopped.`
      );
    }

    // Update status to stopped with timestamp
    const updateData: any = {
      status: 'stopped',
      stopped_at: new Date().toISOString(),
    };

    const { data: updatedLink, error: updateError } = await supabase
      .from('tracking_links')
      .update(updateData)
      .eq('id', id)
      .select('id, status, stopped_at')
      .single();

    // If update failed due to missing updated_at column, try without it
    if (updateError && updateError.message?.includes('updated_at')) {
      const { data: retryLink, error: retryError } = await supabase
        .from('tracking_links')
        .update(updateData)
        .eq('id', id)
        .select('id, status, stopped_at')
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
          new_status: 'stopped',
          timestamp: new Date().toISOString(),
          action: 'stop',
        });

        return NextResponse.json({
          message: 'Promotion stopped successfully. This action is irreversible.',
          promotion: {
            id: finalLink.id,
            status: finalLink.status,
            stopped_at: finalLink.stopped_at,
          },
        });
      }
    }

    if (updateError && !updateError.message?.includes('updated_at')) {
      throw new ValidationError(updateError.message);
    }

    // Log state change
    console.log('[Promotion Lifecycle]', {
      promotion_id: id,
      creator_id: creator.id,
      previous_status: existingLink.status,
      new_status: 'stopped',
      timestamp: new Date().toISOString(),
      action: 'stop',
    });

    return NextResponse.json({
      message: 'Promotion stopped successfully. This action is irreversible.',
      promotion: {
        id: updatedLink.id,
        status: updatedLink.status,
        stopped_at: updatedLink.stopped_at,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
