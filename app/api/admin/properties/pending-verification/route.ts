import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await requireAdmin()
    console.log('[Admin Properties] Admin authenticated:', { id: admin.id, role: admin.role })
    
    const supabase = createAdminSupabaseClient()

    // Get properties pending verification (including submitted status)
    console.log('[Admin Properties] Fetching properties with pending verification status...')
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*, users!properties_developer_id_fkey(id, full_name, email, phone)')
      .in('verification_status', ['pending_verification', 'submitted'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Admin Properties] Supabase query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('[Admin Properties] Properties fetched:', { count: properties?.length || 0 })

    // Get documents for each property
    const propertyIds = properties?.map((p) => p.id) || []
    
    let documents: any[] = []
    let media: any[] = []
    
    if (propertyIds.length > 0) {
      const { data: docsData, error: docsError } = await supabase
        .from('property_documents')
        .select('*')
        .in('property_id', propertyIds)

      if (docsError) {
        console.error('[Admin Properties] Error fetching documents:', docsError)
        // Don't fail the request if documents can't be fetched
      } else {
        documents = docsData || []
      }

      // Get media for each property
      const { data: mediaData, error: mediaError } = await supabase
        .from('property_media')
        .select('*')
        .in('property_id', propertyIds)

      if (mediaError) {
        console.error('[Admin Properties] Error fetching media:', mediaError)
        // Don't fail the request if media can't be fetched
      } else {
        media = mediaData || []
      }
    }

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
    console.error('[Admin Properties] API Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    const { error: errorMessage, statusCode } = handleError(error)
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined,
      },
      { status: statusCode }
    )
  }
}

