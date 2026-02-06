import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
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
    // Use count query for better performance and accuracy
    console.log(`[Property Stats] Fetching leads for property: ${propertyId}`)
    
    const { count: leadsCount, error: leadsError } = await adminSupabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId)

    if (leadsError) {
      console.error('[Property Stats] Error fetching leads count:', leadsError)
      // Fallback: try to get all leads and count manually
      const { data: leads, error: fallbackError } = await adminSupabase
        .from('leads')
        .select('id, property_id')
        .eq('property_id', propertyId)
      
      if (fallbackError) {
        console.error('[Property Stats] Fallback leads query also failed:', fallbackError)
      } else {
        console.log(`[Property Stats] Fallback query found ${leads?.length || 0} leads`)
        if (leads && leads.length > 0) {
          console.log('[Property Stats] Sample lead property_ids:', leads.slice(0, 3).map(l => l.property_id))
        }
      }
      
      const finalLeadsCount = leads?.length || 0
      
      return NextResponse.json({
        views: 0,
        leads: finalLeadsCount,
      })
    }

    console.log(`[Property Stats] Count query returned: ${leadsCount} leads`)
    
    // Verify with a direct query to ensure accuracy (more reliable than count query)
    const { data: verificationLeads, error: verifyError } = await adminSupabase
      .from('leads')
      .select('id')
      .eq('property_id', propertyId)
    
    let finalLeadsCount = leadsCount || 0
    
    if (verifyError) {
      console.error('[Property Stats] Verification query error:', verifyError)
      // Fall back to count query result
      finalLeadsCount = leadsCount || 0
    } else {
      const verifyCount = verificationLeads?.length || 0
      console.log(`[Property Stats] Verification query found: ${verifyCount} leads`)
      
      // Use verification count as it's more reliable (direct data fetch)
      // If counts don't match, log a warning but use verification count
      if (verifyCount !== (leadsCount || 0)) {
        console.warn(`[Property Stats] Count mismatch! Count query: ${leadsCount}, Verification: ${verifyCount}. Using verification count.`)
      }
      
      // Use verification count as the final count (more accurate)
      finalLeadsCount = verifyCount
    }

    // Get views (impressions) from tracking links (use admin client to bypass RLS)
    const { data: trackingLinks, error: trackingError } = await adminSupabase
      .from('tracking_links')
      .select('impressions')
      .eq('property_id', propertyId)

    if (trackingError) {
      console.error('Error fetching tracking links:', trackingError)
    }

    const viewsCount = trackingLinks?.reduce((sum, link) => sum + (link.impressions || 0), 0) || 0

    // Return the actual count from database
    // Database is the single source of truth for lead counts
    // Using direct query (verification) is more reliable than count query
    console.log(`[Property Stats] Final stats - Leads: ${finalLeadsCount}, Views: ${viewsCount}`)
    
    return NextResponse.json({
      views: viewsCount,
      leads: finalLeadsCount,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

