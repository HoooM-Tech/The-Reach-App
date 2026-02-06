import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireDeveloper } from '@/lib/utils/auth'
import { propertySchema } from '@/lib/utils/validation'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

// Lenient schema for saving drafts (only title required)
const draftPropertySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  listing_type: z.enum(['sale', 'rent', 'lead_generation']).optional().default('sale'),
  property_type: z.enum(['land', 'house', 'apartment', 'commercial']).optional(),
  asking_price: z.number().positive().optional(),
  minimum_price: z.number().positive().optional(),
  location: z.object({
    address: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
  visibility: z.enum(['all_creators', 'exclusive_creators']).optional().default('all_creators'),
  lead_price: z.number().positive().optional(),
  lead_quota: z.number().int().positive().optional(),
  campaign_start_date: z.string().datetime().optional(),
  campaign_end_date: z.string().datetime().optional(),
  save_as_draft: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const developer = await requireDeveloper()
    const body = await req.json()
    
    // Check if saving as draft
    const saveAsDraft = body.save_as_draft === true
    
    // Use appropriate schema based on whether it's a draft
    const validated = saveAsDraft 
      ? draftPropertySchema.parse(body)
      : propertySchema.parse(body)

    // Use admin client to bypass RLS since we've already verified auth/role
    const supabase = createAdminSupabaseClient()

    // Determine verification status based on listing type and draft status
    let verificationStatus: 'draft' | 'submitted' | 'pending_verification' = 'draft'
    
    if (!saveAsDraft) {
      if (validated.listing_type === 'sale' || validated.listing_type === 'rent') {
        verificationStatus = 'submitted' // Will move to pending_verification after admin review
      } else if (validated.listing_type === 'lead_generation') {
        verificationStatus = 'draft' // No verification needed for lead generation
      }
    }

    // Create property
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        developer_id: developer.id,
        title: validated.title,
        description: validated.description,
        listing_type: validated.listing_type || 'sale',
        property_type: validated.property_type,
        asking_price: validated.asking_price,
        minimum_price: validated.minimum_price,
        location: validated.location || { address: '', city: '', state: '' },
        visibility: validated.visibility || 'all_creators',
        verification_status: verificationStatus,
        status: 'draft',
        lead_price: (validated as any).lead_price,
        lead_quota: (validated as any).lead_quota,
        campaign_start_date: (validated as any).campaign_start_date,
        campaign_end_date: (validated as any).campaign_end_date,
      })
      .select()
      .single()

    if (error) {
      throw new ValidationError(error.message)
    }

    return NextResponse.json(
      {
        message: saveAsDraft ? 'Property saved as draft' : 'Property created successfully',
        property,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

