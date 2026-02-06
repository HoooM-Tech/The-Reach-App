import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, requireDeveloper } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'
import { normalizeNigerianPhone } from '@/lib/utils/phone'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id

    // Use admin client to bypass RLS for property lookup
    // RLS policies allow verified properties to be viewed, but Bearer tokens might not set context properly
    let supabase
    try {
      supabase = createAdminSupabaseClient()
    } catch (adminError: any) {
      console.error('[Property API] Failed to create admin client:', adminError)
      return NextResponse.json(
        { error: 'Server configuration error', details: adminError.message },
        { status: 500 }
      )
    }

    // Get property
    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (error) {
      console.error('[Property API] Database error:', { propertyId, error: error.message, code: error.code })
      // If it's a not found error, return 404
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Property')
      }
      // Otherwise, it might be a permission/RLS issue
      return NextResponse.json(
        { error: 'Failed to fetch property', details: error.message },
        { status: 500 }
      )
    }

    if (!property) {
      console.error('[Property API] Property not found:', { propertyId })
      throw new NotFoundError('Property')
    }

    // PUBLIC ACCESS RULE: Verified properties are ALWAYS accessible to anyone (logged-in or not)
    // This is critical for creator tracking links to work
    const isVerified = property.verification_status === 'verified'
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Property API] Property access check:', {
        propertyId,
        isVerified,
        verification_status: property.verification_status,
      })
    }
    
    // If property is verified, allow public access immediately
    if (isVerified) {
      // Get property media
      const { data: media } = await supabase
        .from('property_media')
        .select('*')
        .eq('property_id', propertyId)
        .order('order_index', { ascending: true })

      // Get property documents (only for developers/admins - skip for public)
      let documents = null
      try {
        const user = await getAuthenticatedUser()
        if ((user.role === 'developer' && user.id === property.developer_id) || user.role === 'admin') {
          const { data: docs } = await supabase
            .from('property_documents')
            .select('*')
            .eq('property_id', propertyId)
          documents = docs
        }
      } catch {
        // User not authenticated - skip documents (public access)
      }

      return NextResponse.json({
        property: {
          ...property,
          media: media || [],
          documents: documents || [],
        }
      })
    }

    // For non-verified properties, check authenticated user access
    let canViewProperty = false
    
    try {
      const user = await getAuthenticatedUser()
      
      // Developers should NOT use this route - they have their own route at /dashboard/developer/properties/[id]
      // Block developers from accessing this public property route
      if (user.role === 'developer' && user.id === property.developer_id) {
        // Developers should use /dashboard/developer/properties/[id] instead
        // Return 403 to indicate they should use the correct route
        return NextResponse.json(
          { error: 'Developers should use /dashboard/developer/properties/[id] to view their properties' },
          { status: 403 }
        )
      }
      
      // Admins can view all properties
      if (user.role === 'admin') {
        canViewProperty = true
      }
      
      // If property is not verified, check if user has a lead or inspection for this property
      if (!canViewProperty) {
        // Check if user has a lead for this property (by email or phone)
        const { data: allLeads } = await supabase
          .from('leads')
          .select('id, buyer_email, buyer_phone')
          .eq('property_id', propertyId)
        
        if (allLeads && allLeads.length > 0) {
          // Match by email (case-insensitive)
          const emailMatch = user.email && allLeads.some(
            lead => lead.buyer_email?.toLowerCase() === user.email?.toLowerCase()
          )
          
          // Match by phone (normalized)
          const phoneMatch = user.phone && allLeads.some(lead => {
            if (!lead.buyer_phone) return false
            const normalizedUserPhone = normalizeNigerianPhone(user.phone!)
            const normalizedLeadPhone = normalizeNigerianPhone(lead.buyer_phone)
            return normalizedUserPhone === normalizedLeadPhone
          })
          
          if (emailMatch || phoneMatch) {
            canViewProperty = true
          }
        }
        
        // Check if user has an inspection for this property
        if (!canViewProperty) {
          const { data: inspections } = await supabase
            .from('inspections')
            .select('id')
            .eq('property_id', propertyId)
            .eq('buyer_id', user.id)
            .limit(1)
          
          if (inspections && inspections.length > 0) {
            canViewProperty = true
          }
        }
        
        // Check if user is a creator who has a tracking link for this property
        if (!canViewProperty && user.role === 'creator') {
          const { data: trackingLinks } = await supabase
            .from('tracking_links')
            .select('id')
            .eq('property_id', propertyId)
            .eq('creator_id', user.id)
            .limit(1)
          
          if (trackingLinks && trackingLinks.length > 0) {
            canViewProperty = true
          }
        }
      }
    } catch (authError) {
      // User not authenticated AND property is not verified - deny access
      if (process.env.NODE_ENV === 'development') {
        console.log('[Property API] Access denied - not verified and not authenticated:', {
          propertyId,
          verification_status: property.verification_status,
        })
      }
      throw new NotFoundError('Property')
    }

    if (!canViewProperty) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Property API] Access denied - user does not have permission:', {
          propertyId,
          verification_status: property.verification_status,
        })
      }
      throw new NotFoundError('Property')
    }

    // Get property media
    const { data: media } = await supabase
      .from('property_media')
      .select('*')
      .eq('property_id', propertyId)
      .order('order_index', { ascending: true })

    // Get property documents (if user is developer or admin)
    let documents = null
    try {
      const user = await getAuthenticatedUser()
      if (user.role === 'developer' && user.id === property.developer_id || user.role === 'admin') {
        const { data: docs } = await supabase
          .from('property_documents')
          .select('*')
          .eq('property_id', propertyId)
        documents = docs
      }
    } catch {
      // User not authenticated or not authorized - skip documents
    }

    return NextResponse.json({
      property: {
        ...property,
        media: media || [],
        documents: documents || [],
      }
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const developer = await requireDeveloper()
    const propertyId = params.id
    const body = await req.json()

    // Use admin client to bypass RLS for ownership check and update
    const supabase = createAdminSupabaseClient()

    // Verify ownership
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('developer_id')
      .eq('id', propertyId)
      .single()

    if (!existingProperty || existingProperty.developer_id !== developer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update property
    const { data: property, error } = await supabase
      .from('properties')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select()
      .single()

    if (error) {
      throw new ValidationError(error.message)
    }

    return NextResponse.json({
      message: 'Property updated successfully',
      property,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const developer = await requireDeveloper()
    const propertyId = params.id

    // Check if permanent delete is requested (for drafts)
    const { searchParams } = new URL(req.url)
    const permanent = searchParams.get('permanent') === 'true'

    // Use admin client to bypass RLS for ownership check and update
    const supabase = createAdminSupabaseClient()

    // Verify ownership and get current status
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('developer_id, status')
      .eq('id', propertyId)
      .single()

    if (!existingProperty || existingProperty.developer_id !== developer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If permanent delete requested and property is a draft, actually delete it
    if (permanent && existingProperty.status === 'draft') {
      // Delete related records first
      await supabase
        .from('property_media')
        .delete()
        .eq('property_id', propertyId)

      await supabase
        .from('property_documents')
        .delete()
        .eq('property_id', propertyId)

      // Delete the property
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)

      if (error) {
        throw new ValidationError(error.message)
      }

      return NextResponse.json({ message: 'Property permanently deleted' })
    }

    // Soft delete (update status to draft)
    const { error } = await supabase
      .from('properties')
      .update({ status: 'draft' })
      .eq('id', propertyId)

    if (error) {
      throw new ValidationError(error.message)
    }

    return NextResponse.json({ message: 'Property deleted successfully' })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

