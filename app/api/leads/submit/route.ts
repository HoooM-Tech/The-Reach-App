import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { leadSchema } from '@/lib/utils/validation'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { normalizePhoneNumber } from '@/lib/utils/phone'

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

    // Get tracking code from referrer or request
    const referer = req.headers.get('referer') || ''
    const trackingCode = referer.match(/\/p\/([a-f0-9]+)/)?.[1] || body.tracking_code

    let creatorId: string | null = null

    // If tracking code exists, get creator ID
    if (trackingCode) {
      const { data: trackingLink, error: trackingError } = await supabase
        .from('tracking_links')
        .select('id, creator_id, leads')
        .eq('unique_code', trackingCode)
        .maybeSingle()

      if (!trackingError && trackingLink) {
        creatorId = trackingLink.creator_id

        // Update tracking link metrics
        const currentLeads = trackingLink.leads || 0
        await supabase
          .from('tracking_links')
          .update({ leads: currentLeads + 1 })
          .eq('id', trackingLink.id)
      }
    }

    // Normalize phone for consistent matching
    const normalizedPhone = normalizePhoneNumber(validated.buyer_phone)

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
        source_link: trackingCode ? `${process.env.NEXT_PUBLIC_APP_URL}/p/${trackingCode}` : null,
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

