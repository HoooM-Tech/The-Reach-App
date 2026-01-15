import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
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

    // Get client IP for fraud detection
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Log impression
    await supabase
      .from('tracking_links')
      .update({ impressions: (trackingLink.impressions || 0) + 1 })
      .eq('id', trackingLink.id)

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

    // Get client IP for fraud detection
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Update tracking metrics
    const updates: any = {}
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

