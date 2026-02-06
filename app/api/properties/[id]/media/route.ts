import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireDeveloper } from '@/lib/utils/auth'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const addMediaSchema = z.object({
  image_urls: z.array(z.string().url()).min(1, 'At least one image URL is required'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const developer = await requireDeveloper()
    const propertyId = params.id
    const body = await req.json()
    const { image_urls } = addMediaSchema.parse(body)

    const supabase = createAdminSupabaseClient()

    // Verify ownership
    const { data: property } = await supabase
      .from('properties')
      .select('developer_id')
      .eq('id', propertyId)
      .single()

    if (!property || property.developer_id !== developer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current max order_index
    const { data: existingMedia } = await supabase
      .from('property_media')
      .select('order_index')
      .eq('property_id', propertyId)
      .order('order_index', { ascending: false })
      .limit(1)

    const startIndex = existingMedia && existingMedia.length > 0 
      ? (existingMedia[0].order_index || 0) + 1 
      : 0

    // Insert media records
    const mediaRecords = image_urls.map((url, index) => ({
      property_id: propertyId,
      media_type: 'image',
      url,
      order_index: startIndex + index,
    }))

    const { data: media, error } = await supabase
      .from('property_media')
      .insert(mediaRecords)
      .select()

    if (error) {
      throw new ValidationError(error.message)
    }

    return NextResponse.json({
      message: 'Media added successfully',
      media,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

// DELETE - Remove a specific media item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const developer = await requireDeveloper()
    const propertyId = params.id
    const { searchParams } = new URL(req.url)
    const mediaId = searchParams.get('mediaId')

    if (!mediaId) {
      return NextResponse.json({ error: 'mediaId is required' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Verify ownership
    const { data: property } = await supabase
      .from('properties')
      .select('developer_id')
      .eq('id', propertyId)
      .single()

    if (!property || property.developer_id !== developer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify media belongs to this property
    const { data: media } = await supabase
      .from('property_media')
      .select('id')
      .eq('id', mediaId)
      .eq('property_id', propertyId)
      .single()

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Delete the media record
    const { error } = await supabase
      .from('property_media')
      .delete()
      .eq('id', mediaId)

    if (error) {
      throw new ValidationError(error.message)
    }

    return NextResponse.json({
      message: 'Media deleted successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

