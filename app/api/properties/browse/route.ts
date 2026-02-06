import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    // Support both 'type' and 'listing_type' for backward compatibility
    const listingType = searchParams.get('listing_type') || searchParams.get('type')
    const propertyType = searchParams.get('property_type')
    // Support both 'city' and 'location' for backward compatibility
    const city = searchParams.get('city') || searchParams.get('location')
    const priceMin = searchParams.get('min_price') || searchParams.get('priceMin')
    const priceMax = searchParams.get('max_price') || searchParams.get('priceMax')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('verification_status', 'verified')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (listingType) {
      query = query.eq('listing_type', listingType)
    }

    if (propertyType) {
      query = query.eq('property_type', propertyType)
    }

    if (city) {
      query = query.ilike('location->>city', `%${city}%`)
    }

    if (priceMin) {
      query = query.gte('asking_price', parseFloat(priceMin))
    }

    if (priceMax) {
      query = query.lte('asking_price', parseFloat(priceMax))
    }

    const { data: properties, error, count } = await query

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
    }))

    return NextResponse.json({
      properties: propertiesWithMedia || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

