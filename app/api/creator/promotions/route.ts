import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { requireCreator } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    const creator = await requireCreator();
    const supabase = createAdminSupabaseClient();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Build query for tracking links with property data
    // Note: status column may not exist if migration hasn't been run yet
    let query = supabase
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
          asking_price,
          location,
          verification_status,
          property_media (
            id,
            url,
            media_type,
            order_index
          )
        )
      `)
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false });

    const { data: links, error } = await query;

    if (error) {
      // If error is about missing status column, try querying without it
      if (error.message?.includes('column') && error.message?.includes('status')) {
        // Status column doesn't exist yet - query without it and default all to 'active'
        const retryQuery = supabase
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
            created_at,
            properties:property_id (
              id,
              title,
              asking_price,
              location,
              verification_status,
              property_media (
                id,
                url,
                media_type,
                order_index
              )
            )
          `)
          .eq('creator_id', creator.id)
          .order('created_at', { ascending: false });
        
        const { data: retryLinks, error: retryError } = await retryQuery;
        if (retryError) {
          throw retryError;
        }
        
        // Format with default status
        let promotions = (retryLinks || []).map((link: any) => {
          const property = link.properties;
          const featuredImage = property?.property_media
            ?.filter((m: any) => m.media_type === 'image')
            .sort((a: any, b: any) => a.order_index - b.order_index)[0];

          return {
            id: link.id,
            property_id: link.property_id,
            unique_code: link.unique_code,
            property_title: property?.title || 'Unknown Property',
            property_price: property?.asking_price || 0,
            property_address: property?.location?.address || '',
            featured_image: featuredImage?.url || null,
            status: 'active', // Default since column doesn't exist
            impressions: link.impressions || 0,
            clicks: link.clicks || 0,
            leads: link.leads || 0,
            inspections: link.inspections || 0,
            conversions: link.conversions || 0,
            created_at: link.created_at,
          };
        });

        // Apply filters
        if (search) {
          const searchLower = search.toLowerCase();
          promotions = promotions.filter((p: any) => 
            p.property_title.toLowerCase().includes(searchLower) ||
            p.property_address.toLowerCase().includes(searchLower) ||
            p.status.toLowerCase().includes(searchLower)
          );
        }
        if (status !== 'all') {
          promotions = promotions.filter((p: any) => p.status === status);
        }

        return NextResponse.json({
          promotions,
          total: promotions.length,
        });
      }
      throw error;
    }

    // Check for auto-expiration and update expired promotions
    const now = new Date();
    const activeLinks = (links || []).filter((link: any) => {
      if (link.status === 'active' && link.expires_at) {
        const expiresAt = new Date(link.expires_at);
        if (expiresAt < now) {
          // Auto-expire this promotion
          const expireData: any = {
            status: 'expired',
            expired_at: now.toISOString(),
          };
          
          supabase
            .from('tracking_links')
            .update(expireData)
            .eq('id', link.id)
            .then(() => {
              console.log('[Promotion Lifecycle] Auto-expired', {
                promotion_id: link.id,
                creator_id: creator.id,
                timestamp: now.toISOString(),
                action: 'auto-expire',
              });
            })
            .catch((err: any) => {
              // Ignore errors about missing updated_at column (migration not run yet)
              if (!err?.message?.includes('updated_at')) {
                console.error('Failed to auto-expire promotion:', err);
              }
            });
          
          link.status = 'expired';
          link.expired_at = now.toISOString();
        }
      }
      return true;
    });

    // Format response with property data
    let promotions = activeLinks.map((link: any) => {
      const property = link.properties;
      const featuredImage = property?.property_media
        ?.filter((m: any) => m.media_type === 'image')
        .sort((a: any, b: any) => a.order_index - b.order_index)[0];

      // Get status from database (default to 'active' if not set or column doesn't exist)
      const promotionStatus = (link as any).status || 'active';

      return {
        id: link.id,
        property_id: link.property_id,
        unique_code: link.unique_code,
        property_title: property?.title || 'Unknown Property',
        property_price: property?.asking_price || 0,
        property_address: property?.location?.address || '',
        featured_image: featuredImage?.url || null,
        status: promotionStatus,
        impressions: link.impressions || 0,
        clicks: link.clicks || 0,
        leads: link.leads || 0,
        inspections: link.inspections || 0,
        conversions: link.conversions || 0,
        created_at: link.created_at,
      };
    });

    // Apply search filter (client-side filtering)
    if (search) {
      const searchLower = search.toLowerCase();
      promotions = promotions.filter((p: any) => 
        p.property_title.toLowerCase().includes(searchLower) ||
        p.property_address.toLowerCase().includes(searchLower) ||
        p.status.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status (if status field is added later)
    const filteredPromotions = status === 'all' 
      ? promotions 
      : promotions.filter((p: any) => p.status === status);

    return NextResponse.json({
      promotions: filteredPromotions,
      total: filteredPromotions.length,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
