import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()

    // Get properties pending verification (including submitted status)
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*, users!properties_developer_id_fkey(id, full_name, email, phone)')
      .in('verification_status', ['pending_verification', 'submitted'])
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    // Get documents for each property
    const propertyIds = properties?.map((p) => p.id) || []
    const { data: documents } = await supabase
      .from('property_documents')
      .select('*')
      .in('property_id', propertyIds)

    // Get media for each property
    const { data: media } = await supabase
      .from('property_media')
      .select('*')
      .in('property_id', propertyIds)

    // Attach documents and media to properties
    const propertiesWithDetails = properties?.map((property) => ({
      ...property,
      documents: documents?.filter((d) => d.property_id === property.id) || [],
      media: media?.filter((m) => m.property_id === property.id) || [],
    })) || []

    return NextResponse.json({
      properties: propertiesWithDetails,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

