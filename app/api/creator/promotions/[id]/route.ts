import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const creator = await requireCreator();
    const { id } = await Promise.resolve(params);
    const supabase = createAdminSupabaseClient();

    // Fetch tracking link with full property details
    const { data: link, error: linkError } = await supabase
      .from('tracking_links')
      .select(`
        id,
        property_id,
        unique_code,
        impressions,
        clicks,
        leads,
        inspections,
        conversions,
        status,
        expires_at,
        created_at,
        properties:property_id (
          id,
          title,
          description,
          asking_price,
          minimum_price,
          location,
          property_type,
          verification_status,
          property_media (
            id,
            url,
            media_type,
            order_index
          )
        )
      `)
      .eq('id', id)
      .eq('creator_id', creator.id)
      .single();

    if (linkError || !link) {
      throw new NotFoundError('Promotion');
    }

    // Check for auto-expiration
    const now = new Date();
    let currentStatus = link.status || 'active';
    if (currentStatus === 'active' && link.expires_at) {
      const expiresAt = new Date(link.expires_at);
      if (expiresAt < now) {
        // Auto-expire this promotion
        const expireData: any = {
          status: 'expired',
          expired_at: now.toISOString(),
        };
        
        const { error: expireError } = await supabase
          .from('tracking_links')
          .update(expireData)
          .eq('id', link.id);
        
        // If error is due to missing updated_at, ignore it (migration not run yet)
        if (expireError && !expireError.message?.includes('updated_at')) {
          console.error('Failed to auto-expire promotion:', expireError);
        }
        
        if (!expireError) {
          currentStatus = 'expired';
          link.status = 'expired';
          link.expired_at = now.toISOString();
          
          console.log('[Promotion Lifecycle] Auto-expired', {
            promotion_id: link.id,
            creator_id: creator.id,
            timestamp: now.toISOString(),
            action: 'auto-expire',
          });
        }
      }
    }

    // Handle property - Supabase returns it as an object, not array
    const property = Array.isArray(link.properties) ? link.properties[0] : link.properties;
    
    if (!property) {
      throw new NotFoundError('Property');
    }

    const images = property.property_media
      ?.filter((m: any) => m.media_type === 'image')
      .sort((a: any, b: any) => a.order_index - b.order_index) || [];

    // Build tracking link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const trackingLink = `${baseUrl}/property/${property.id}?ref=${link.unique_code}`;

    // Calculate stats for last 30 days (simplified - in production, use analytics table)
    const stats = {
      leads: link.leads || 0,
      clicks: link.clicks || 0,
      conversions: link.conversions || 0,
      inspections: link.inspections || 0,
    };

    return NextResponse.json({
      promotion: {
        id: link.id,
        property_id: link.property_id,
        unique_code: link.unique_code,
        tracking_link: trackingLink,
        status: currentStatus,
        ...stats,
        created_at: link.created_at,
      },
      property: {
        id: property.id,
        title: property.title,
        description: property.description || '',
        price: property.asking_price || property.minimum_price || 0,
        address: property.location?.address || '',
        property_type: property.property_type,
        verification_status: property.verification_status,
        images: images.map((img: any) => img.url),
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * PATCH /api/creator/promotions/[id]
 * 
 * Updates promotion status (pause, resume, or stop)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const creator = await requireCreator();
    const { id } = await Promise.resolve(params);
    const body = await req.json();
    const { status } = body;

    if (!status || !['active', 'paused', 'stopped'].includes(status)) {
      throw new ValidationError('Invalid status. Must be "active", "paused", or "stopped"');
    }

    const supabase = createAdminSupabaseClient();

    // Verify the promotion belongs to the creator
    const { data: existingLink, error: checkError } = await supabase
      .from('tracking_links')
      .select('id, creator_id')
      .eq('id', id)
      .eq('creator_id', creator.id)
      .single();

    if (checkError || !existingLink) {
      throw new NotFoundError('Promotion');
    }

    // Update status
    const { data: updatedLink, error: updateError } = await supabase
      .from('tracking_links')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (updateError) {
      throw new ValidationError(updateError.message);
    }

    return NextResponse.json({
      message: `Promotion ${status === 'active' ? 'resumed' : status === 'paused' ? 'paused' : 'stopped'} successfully`,
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
