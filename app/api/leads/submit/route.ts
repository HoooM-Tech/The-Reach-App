import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { leadSchema } from '@/lib/utils/validation'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { normalizeNigerianPhone } from '@/lib/utils/phone'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = leadSchema.parse(body)
    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient() // Use admin client to bypass RLS for public lead submission

    try {
      const user = await getAuthenticatedUser()
      if (user.role === 'admin' || user.role === 'developer') {
        throw new ValidationError(`${user.role === 'admin' ? 'Admins' : 'Developers'} cannot submit leads`)
      }
    } catch (authError: any) {
      // If authentication fails, it's fine - anonymous users can submit leads
      // Only throw if it's a role-based error
      if (authError.message?.includes('cannot submit leads')) {
        throw authError
      }
      // Otherwise, continue as anonymous user
    }

    // Get tracking code from multiple sources (priority: validated.source_code > body.tracking_code > referer)
    const referer = req.headers.get('referer') || ''
    const trackingCode = validated.source_code || 
                        (body as any).tracking_code || 
                        referer.match(/[?&]ref=([a-f0-9-]+)/)?.[1] ||
                        referer.match(/\/p\/([a-f0-9]+)/)?.[1]

    let creatorId: string | null = null

    // If tracking code exists, get creator ID and update metrics
    if (trackingCode) {
      // Use admin client to bypass RLS for tracking link lookup
      const { data: trackingLink, error: trackingError } = await adminSupabase
        .from('tracking_links')
        .select('id, creator_id, leads, property_id, status, expires_at')
        .eq('unique_code', trackingCode)
        .maybeSingle()

      if (!trackingError && trackingLink) {
        // Verify the tracking link matches the property
        if (trackingLink.property_id === validated.property_id) {
          creatorId = trackingLink.creator_id

          // Check if promotion is active and not expired before updating metrics
          const now = new Date();
          const isExpired = trackingLink.expires_at && new Date(trackingLink.expires_at) < now;
          const isActive = trackingLink.status === 'active' && !isExpired;

          // Only update tracking link metrics for active promotions
          if (isActive) {
            // Update tracking link metrics (leads)
            const currentLeads = trackingLink.leads || 0
            await adminSupabase
              .from('tracking_links')
              .update({ leads: currentLeads + 1 })
              .eq('id', trackingLink.id)
          } else {
            // Auto-expire if needed
            if (trackingLink.status === 'active' && isExpired) {
              const expireData: any = {
                status: 'expired',
                expired_at: now.toISOString(),
              };
              
              const { error: expireError } = await adminSupabase
                .from('tracking_links')
                .update(expireData)
                .eq('id', trackingLink.id);
              
              if (expireError && !expireError.message?.includes('updated_at')) {
                console.error('Failed to auto-expire promotion:', expireError);
              }
            }
          }
        }
      }
    }

    // Normalize phone for consistent matching
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeNigerianPhone(validated.buyer_phone);
    } catch (error) {
      throw new ValidationError(error instanceof Error ? error.message : 'Invalid phone number format');
    }

    // Verify property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', validated.property_id)
      .single()

    if (propertyError || !property) {
      throw new NotFoundError('Property')
    }

    // Check if lead already exists (anti-fraud: same phone for same property)
    // Use admin client to check across all leads regardless of user
    const { data: existingLead, error: existingLeadError } = await adminSupabase
      .from('leads')
      .select('id')
      .eq('property_id', validated.property_id)
      .eq('buyer_phone', normalizedPhone)
      .maybeSingle()

    if (!existingLeadError && existingLead) {
      throw new ValidationError('Lead already exists for this phone number')
    }

    // Create lead using admin client to bypass RLS (leads can be submitted by anonymous users)
    const { data: lead, error: leadError } = await adminSupabase
      .from('leads')
      .insert({
        property_id: validated.property_id,
        creator_id: creatorId,
        buyer_name: validated.buyer_name,
        buyer_phone: normalizedPhone,
        buyer_email: validated.buyer_email,
        source_link: trackingCode ? `${process.env.NEXT_PUBLIC_APP_URL}/property/${validated.property_id}?ref=${trackingCode}` : null,
        status: 'new',
      })
      .select()
      .single()

    if (leadError) {
      throw new ValidationError(leadError.message)
    }

    // Update property lead count if it's a lead generation campaign
    if (property.listing_type === 'lead_generation') {
      await supabase
        .from('properties')
        .update({ leads_generated: (property.leads_generated || 0) + 1 })
        .eq('id', validated.property_id)
    }

    // Send notifications using helper
    try {
      const { notificationHelpers } = await import('@/lib/services/notification-helper')
      await notificationHelpers.newLead({
        developerId: property.developer_id,
        creatorId: creatorId || undefined,
        propertyId: property.id,
        propertyTitle: property.title,
        buyerName: validated.buyer_name,
        buyerPhone: validated.buyer_phone,
        buyerEmail: validated.buyer_email,
        leadId: lead.id,
      })
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        message: 'Lead submitted successfully',
        lead,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

