import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') // 'all', 'pending', 'verified', 'rejected', 'draft'

    // Build query - get all properties by default
    let query = supabase
      .from('properties')
      .select('*, users!properties_developer_id_fkey(id, full_name, email, phone)')
      .order('created_at', { ascending: false })

    // Apply status filter if provided
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        query = query.in('verification_status', ['pending_verification', 'submitted'])
      } else {
        query = query.eq('verification_status', statusFilter)
      }
    }

    const { data: properties, error } = await query

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
      total: propertiesWithDetails.length,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

