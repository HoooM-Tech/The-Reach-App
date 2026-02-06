import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireDeveloper } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    const developer = await requireDeveloper()
    // Use admin client to ensure we can read all properties including drafts
    const supabase = createAdminSupabaseClient()

    // Get all properties for this developer (including drafts and pending)
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .eq('developer_id', developer.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    // Get media for each property
    const propertyIds = properties?.map((p) => p.id) || []
    const { data: media } = await supabase
      .from('property_media')
      .select('*')
      .in('property_id', propertyIds)

    const propertiesWithMedia = properties?.map((property) => ({
      ...property,
      media: media?.filter((m) => m.property_id === property.id) || [],
    })) || []

    return NextResponse.json({
      properties: propertiesWithMedia,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

