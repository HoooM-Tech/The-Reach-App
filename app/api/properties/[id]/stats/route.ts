import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const propertyId = params.id

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    // Verify property exists and user has access
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, developer_id')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      throw new NotFoundError('Property')
    }

    // Verify user is the developer or admin
    if (currentUser.id !== property.developer_id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get leads count for this property (use admin client to bypass RLS)
    const { data: leads, error: leadsError } = await adminSupabase
      .from('leads')
      .select('id')
      .eq('property_id', propertyId)

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
    }

    const leadsCount = leads?.length || 0

    // Get views (impressions) from tracking links (use admin client to bypass RLS)
    const { data: trackingLinks, error: trackingError } = await adminSupabase
      .from('tracking_links')
      .select('impressions')
      .eq('property_id', propertyId)

    if (trackingError) {
      console.error('Error fetching tracking links:', trackingError)
    }

    const viewsCount = trackingLinks?.reduce((sum, link) => sum + (link.impressions || 0), 0) || 0

    // Also check if property has a direct views/leads_generated field
    const { data: propertyStats } = await adminSupabase
      .from('properties')
      .select('leads_generated')
      .eq('id', propertyId)
      .single()

    // Use leads_generated from property if it's higher than actual leads count
    // (in case there's a discrepancy or leads were generated before tracking)
    const finalLeadsCount = Math.max(leadsCount, propertyStats?.leads_generated || 0)

    return NextResponse.json({
      views: viewsCount,
      leads: finalLeadsCount,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

