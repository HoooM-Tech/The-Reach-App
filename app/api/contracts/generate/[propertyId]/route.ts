import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    await requireAdmin()
    const propertyId = params.propertyId
    const supabase = createServerSupabaseClient()

    // Get property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*, users!properties_developer_id_fkey(*)')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      throw new NotFoundError('Property')
    }

    if (property.listing_type !== 'sale') {
      throw new ValidationError('Contract of sale can only be generated for sale listings')
    }

    if (property.verification_status !== 'verified') {
      throw new ValidationError('Property must be verified before generating contract')
    }

    // Check if contract already exists
    const { data: existingContract } = await supabase
      .from('contracts_of_sale')
      .select('id')
      .eq('property_id', propertyId)
      .single()

    if (existingContract) {
      return NextResponse.json({
        message: 'Contract already exists',
        contract_id: existingContract.id,
      })
    }

    // Generate contract terms
    const terms = {
      property_details: {
        address: property.location?.address || '',
        type: property.property_type || '',
        description: property.description || '',
      },
      asking_price: property.asking_price || 0,
      minimum_acceptable_price: property.minimum_price || property.asking_price || 0,
      creator_commission_percentage: 15,
      sales_mode: 'reach',
      dynamic_pricing_enabled: !!property.minimum_price && property.minimum_price < (property.asking_price || 0),
      payout_rules: {
        developer_percentage: 80,
        reach_percentage: 5,
        creator_percentage: 15,
      },
      document_handover_obligations: [
        'deed_of_assignment',
        'letter_of_allocation',
        'survey_plan',
        'building_approval',
        'receipts_or_title_docs',
      ],
      dispute_resolution_clause: 'All disputes shall be resolved through arbitration in accordance with Nigerian law.',
      termination_clause: 'Either party may terminate this contract with 30 days written notice, subject to completion of ongoing transactions.',
    }

    // Create contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts_of_sale')
      .insert({
        property_id: propertyId,
        developer_id: property.developer_id,
        terms,
        status: 'pending_developer_signature',
      })
      .select()
      .single()

    if (contractError) {
      throw new ValidationError(contractError.message)
    }

    // Send notification to developer
    try {
      const { notificationHelpers } = await import('@/lib/services/notification-helper')
      await notificationHelpers.contractExecuted({
        developerId: property.developer_id,
        propertyId: propertyId,
        propertyTitle: property.title,
        contractId: contract.id,
      })
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        message: 'Contract generated successfully',
        contract,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

