import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireCreator } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * POST /api/creator/promotions/[id]/pause
 * 
 * Pauses an active promotion
 * State transition: active → paused
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

    // Validate state transition: only active promotions can be paused
    if (existingLink.status !== 'active') {
      throw new ValidationError(
        `Cannot pause promotion. Current status is "${existingLink.status}". Only active promotions can be paused.`
      );
    }

    // Update status with timestamp
    // Note: updated_at may not exist if migration hasn't been run yet
    const updateData: any = {
      status: 'paused',
      paused_at: new Date().toISOString(),
    };

    const { data: updatedLink, error: updateError } = await supabase
      .from('tracking_links')
      .update(updateData)
      .eq('id', id)
      .select('id, status, paused_at')
      .single();

    // If update failed due to missing updated_at column, try without it
    if (updateError && updateError.message?.includes('updated_at')) {
      const { data: retryLink, error: retryError } = await supabase
        .from('tracking_links')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, status, paused_at')
        .single();
      
      if (retryError) {
        throw new ValidationError(retryError.message);
      }
      
      // Use retry result
      const finalLink = retryLink;
      if (finalLink) {
        console.log('[Promotion Lifecycle]', {
          promotion_id: id,
          creator_id: creator.id,
          previous_status: 'active',
          new_status: 'paused',
          timestamp: new Date().toISOString(),
          action: 'pause',
        });

        return NextResponse.json({
          message: 'Promotion paused successfully',
          promotion: {
            id: finalLink.id,
            status: finalLink.status,
            paused_at: finalLink.paused_at,
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
      previous_status: 'active',
      new_status: 'paused',
      timestamp: new Date().toISOString(),
      action: 'pause',
    });

    return NextResponse.json({
      message: 'Promotion paused successfully',
      promotion: {
        id: updatedLink.id,
        status: updatedLink.status,
        paused_at: updatedLink.paused_at,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
