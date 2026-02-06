import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/utils/auth'
import { generateUniqueCode } from '@/lib/utils/crypto'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const generateLinkSchema = z.object({
  property_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const creator = await requireCreator()
    const body = await req.json()
    const { property_id } = generateLinkSchema.parse(body)

    // Use admin client to bypass RLS since we've already verified authorization
    const supabase = createAdminSupabaseClient()

    // Verify property exists and is verified
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single()

    if (propertyError || !property) {
      throw new NotFoundError('Property')
    }

    if (property.verification_status !== 'verified') {
      throw new ValidationError('Property must be verified before promotion')
    }

    // Check visibility restrictions
    if (property.visibility === 'exclusive_creators') {
      if (!creator.tier || creator.tier < 3) {
        throw new ValidationError('This property is exclusive to tier 3-4 creators')
      }
    }

    // Check if link already exists
    const { data: existingLink } = await supabase
      .from('tracking_links')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('property_id', property_id)
      .single()

    if (existingLink) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return NextResponse.json({
        message: 'Tracking link already exists',
        link: `${baseUrl}/p/${existingLink.unique_code}`,
        tracking_link: existingLink,
      })
    }

    // Generate unique code
    const uniqueCode = generateUniqueCode(creator.id, property_id)

    // Create tracking link
    const { data: trackingLink, error: linkError } = await supabase
      .from('tracking_links')
      .insert({
        creator_id: creator.id,
        property_id: property_id,
        unique_code: uniqueCode,
        impressions: 0,
        clicks: 0,
        leads: 0,
        inspections: 0,
        conversions: 0,
      })
      .select()
      .single()

    if (linkError) {
      throw new ValidationError(linkError.message)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const fullLink = `${baseUrl}/p/${uniqueCode}`

    return NextResponse.json(
      {
        message: 'Tracking link generated successfully',
        link: fullLink,
        tracking_link: trackingLink,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

