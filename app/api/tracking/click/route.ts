import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/tracking/click
 * 
 * Tracks a click (user interaction) for a creator tracking link.
 * This endpoint is PUBLIC and does not require authentication.
 * 
 * Body: { property_id: string, creator_code: string, action?: string }
 * action: 'lead_form' | 'inspection' | 'cta' (optional, for analytics)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { property_id, creator_code, action } = body;

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
      .select('id, clicks, status, expires_at')
      .eq('property_id', property_id)
      .eq('unique_code', creator_code)
      .single();

    if (linkError || !trackingLink) {
      // Tracking link not found - return success but not tracked
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
    
    // Increment click count (only for active promotions)
    const currentClicks = trackingLink.clicks || 0;
    const { error: updateError } = await supabase
      .from('tracking_links')
      .update({ clicks: currentClicks + 1 })
      .eq('id', trackingLink.id);

    if (updateError) {
      console.error('Failed to update click:', updateError);
      return NextResponse.json({ success: true, tracked: false });
    }

    return NextResponse.json({ 
      success: true, 
      tracked: true,
      clicks: currentClicks + 1,
      action,
      session_id: sessionId
    });
  } catch (error) {
    // Never fail the request due to tracking errors
    console.error('Tracking click error:', error);
    return NextResponse.json({ success: true, tracked: false });
  }
}
