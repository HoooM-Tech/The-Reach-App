import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/tracking/impression
 * 
 * Tracks an impression (page view) for a creator tracking link.
 * This endpoint is PUBLIC and does not require authentication.
 * 
 * Body: { property_id: string, creator_code: string, session_id?: string }
 * session_id: Optional client-side session ID for deduplication
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { property_id, creator_code, session_id } = body;

    if (!property_id || !creator_code) {
      return NextResponse.json(
        { error: 'property_id and creator_code are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // Find tracking link by property_id and unique_code
    // Check status and expiration before tracking
    const { data: trackingLink, error: linkError } = await supabase
      .from('tracking_links')
      .select('id, impressions, status, expires_at')
      .eq('property_id', property_id)
      .eq('unique_code', creator_code)
      .single();

    if (linkError || !trackingLink) {
      // Tracking link not found - this is not an error, just return success
      // (link might be invalid or expired, but we don't want to break the page)
      return NextResponse.json({ success: true, tracked: false });
    }

    // Check if promotion is active and not expired
    const now = new Date();
    const isExpired = trackingLink.expires_at && new Date(trackingLink.expires_at) < now;
    const isActive = trackingLink.status === 'active' && !isExpired;

    // Only track analytics for active promotions
    if (!isActive) {
      // Auto-expire if needed
      if (trackingLink.status === 'active' && isExpired) {
        const expireData: any = {
          status: 'expired',
          expired_at: now.toISOString(),
        };
        
        const { error: expireError } = await supabase
          .from('tracking_links')
          .update(expireData)
          .eq('id', trackingLink.id);
        
        // Ignore errors about missing updated_at column (migration not run yet)
        if (expireError && !expireError.message?.includes('updated_at')) {
          console.error('Failed to auto-expire promotion:', expireError);
        }
        
        console.log('[Promotion Lifecycle] Auto-expired', {
          promotion_id: trackingLink.id,
          timestamp: now.toISOString(),
          action: 'auto-expire',
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        tracked: false,
        reason: `Promotion is ${trackingLink.status}${isExpired ? ' (expired)' : ''}`,
      });
    }

    // Deduplication: Client-side deduplication prevents double-counting
    // Server-side we track the request - deduplication happens via client session tracking
    const sessionId = body.session_id || `session_${Date.now()}`;
    
    // Increment impression count (only for active promotions)
    const currentImpressions = trackingLink.impressions || 0;
    const { error: updateError } = await supabase
      .from('tracking_links')
      .update({ impressions: currentImpressions + 1 })
      .eq('id', trackingLink.id);

    if (updateError) {
      console.error('Failed to update impression:', updateError);
      // Don't fail the request - tracking is non-critical
      return NextResponse.json({ success: true, tracked: false });
    }

    return NextResponse.json({ 
      success: true, 
      tracked: true,
      impressions: currentImpressions + 1,
      session_id: sessionId
    });
  } catch (error) {
    // Never fail the request due to tracking errors
    console.error('Tracking impression error:', error);
    return NextResponse.json({ success: true, tracked: false });
  }
}
