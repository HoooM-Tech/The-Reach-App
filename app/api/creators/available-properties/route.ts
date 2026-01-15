import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { requireCreator } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    const creator = await requireCreator()
    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    // Get all verified and active properties
    let query = adminSupabase
      .from('properties')
      .select('*, users!properties_developer_id_fkey(id, full_name, email)')
      .eq('verification_status', 'verified')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Get all properties first
    const { data: allProperties, error: propertiesError } = await query

    if (propertiesError) {
      throw new Error(propertiesError.message)
    }

    // Filter based on visibility restrictions
    const availableProperties = allProperties?.filter((property) => {
      // If property is exclusive to creators, check tier
      if (property.visibility === 'exclusive_creators') {
        // Only tier 3-4 creators can see exclusive properties
        return creator.tier && creator.tier >= 3
      }
      // All creators can see public properties
      return property.visibility === 'all_creators' || !property.visibility
    }) || []

    // Get tracking links to see which properties the creator is already promoting
    const { data: existingLinks } = await adminSupabase
      .from('tracking_links')
      .select('property_id')
      .eq('creator_id', creator.id)

    const existingPropertyIds = new Set(existingLinks?.map((l) => l.property_id) || [])

    // Get media for each property
    const propertyIds = availableProperties.map((p) => p.id)
    const { data: media } = await adminSupabase
      .from('property_media')
      .select('*')
      .in('property_id', propertyIds)

    const propertiesWithMedia = availableProperties.map((property) => ({
      ...property,
      media: media?.filter((m) => m.property_id === property.id) || [],
      already_promoting: existingPropertyIds.has(property.id),
    }))

    return NextResponse.json({
      properties: propertiesWithMedia,
      total: propertiesWithMedia.length,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

