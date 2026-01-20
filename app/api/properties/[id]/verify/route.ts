import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { ValidationError, NotFoundError, handleError } from '@/lib/utils/errors'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const propertyId = params.id
    const body = await req.json()
    const { action, reason } = body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      throw new ValidationError('Invalid action. Must be "approve" or "reject"')
    }

    // Use admin client to bypass RLS since we've already verified admin authorization
    const supabase = createAdminSupabaseClient()

    // Get property
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (fetchError || !property) {
      throw new NotFoundError('Property')
    }

    // Update verification status
    const verificationStatus = action === 'approve' ? 'verified' : 'rejected'
    const status = action === 'approve' ? 'active' : 'draft'

    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({
        verification_status: verificationStatus,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select()
      .single()

    if (updateError) {
      throw new ValidationError(updateError.message)
    }

    // If approved and listing type is sale, generate contract
    if (action === 'approve' && property.listing_type === 'sale') {
      // Contract generation will be handled by a separate endpoint
      // This is just a placeholder
    }

    // Send notifications
    try {
      const { notificationHelpers } = await import('@/lib/services/notification-helper')
      if (action === 'approve') {
        await notificationHelpers.propertyVerified({
          developerId: property.developer_id,
          propertyId: propertyId,
          propertyTitle: property.title,
        })
      } else {
        await notificationHelpers.propertyRejected({
          developerId: property.developer_id,
          propertyId: propertyId,
          propertyTitle: property.title,
          reason: body.reason,
        })
      }
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      message: `Property ${action === 'approve' ? 'verified' : 'rejected'} successfully`,
      property: updatedProperty,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

