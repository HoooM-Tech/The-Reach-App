import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { uniqueCode: string } }
) {
  try {
    const uniqueCode = params.uniqueCode
    const supabase = createServerSupabaseClient()

    // Get tracking link
    const { data: trackingLink, error } = await supabase
      .from('tracking_links')
      .select('*, properties(*)')
      .eq('unique_code', uniqueCode)
      .single()

    if (error || !trackingLink) {
      throw new NotFoundError('Tracking link')
    }

    // Check if promotion is active and not expired
    const now = new Date();
    const isExpired = trackingLink.expires_at && new Date(trackingLink.expires_at) < now;
    const isActive = trackingLink.status === 'active' && !isExpired;

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
      if (!expireError || expireError.message?.includes('updated_at')) {
        console.log('[Promotion Lifecycle] Auto-expired', {
          promotion_id: trackingLink.id,
          timestamp: now.toISOString(),
          action: 'auto-expire',
        });
      } else {
        console.error('Failed to auto-expire promotion:', expireError);
      }
    }

    // Get client IP for fraud detection
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Log impression (only for active promotions)
    if (isActive || (trackingLink.status === 'active' && !isExpired)) {
      await supabase
        .from('tracking_links')
        .update({ impressions: (trackingLink.impressions || 0) + 1 })
        .eq('id', trackingLink.id)
    }

    // Return property data
    return NextResponse.json({
      property: trackingLink.properties,
      tracking_link: {
        id: trackingLink.id,
        unique_code: trackingLink.unique_code,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { uniqueCode: string } }
) {
  try {
    const uniqueCode = params.uniqueCode
    const body = await req.json()
    const { event_type } = body // 'click' | 'lead'

    const supabase = createServerSupabaseClient()

    // Get tracking link
    const { data: trackingLink, error } = await supabase
      .from('tracking_links')
      .select('*')
      .eq('unique_code', uniqueCode)
      .single()

    if (error || !trackingLink) {
      throw new NotFoundError('Tracking link')
    }

    // Check if promotion is active and not expired
    const now = new Date();
    const isExpired = trackingLink.expires_at && new Date(trackingLink.expires_at) < now;
    const isActive = trackingLink.status === 'active' && !isExpired;

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
      if (!expireError || expireError.message?.includes('updated_at')) {
        console.log('[Promotion Lifecycle] Auto-expired', {
          promotion_id: trackingLink.id,
          timestamp: now.toISOString(),
          action: 'auto-expire',
        });
      } else {
        console.error('Failed to auto-expire promotion:', expireError);
      }
    }

    // Get client IP for fraud detection
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Update tracking metrics (only for active promotions)
    const updates: any = {}
    if (isActive) {
      if (event_type === 'click') {
        updates.clicks = (trackingLink.clicks || 0) + 1
      } else if (event_type === 'lead') {
        updates.leads = (trackingLink.leads || 0) + 1
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('tracking_links')
          .update(updates)
          .eq('id', trackingLink.id)
      }
    }

    return NextResponse.json({
      message: 'Event tracked successfully',
      tracking_link: {
        ...trackingLink,
        ...updates,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

