import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'
import { notificationHelpers } from '@/lib/services/notification-helper'

/**
 * POST - Developer submits all documents, moving handover to awaiting_buyer_signature
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { handoverId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const handoverId = params.handoverId

    if (currentUser.role !== 'developer' && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminSupabaseClient()

    // Get handover with property
    const { data: handover, error: handoverError } = await adminSupabase
      .from('handovers')
      .select('*, properties(id, title, developer_id)')
      .eq('id', handoverId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    // Verify developer owns this handover
    if (currentUser.role !== 'admin' && handover.developer_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check that documents have been uploaded
    const { count: docCount } = await adminSupabase
      .from('property_documents')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', handover.property_id)

    if (!docCount || docCount === 0) {
      throw new ValidationError('Please upload at least one document before submitting')
    }

    // Update handover status
    const { data: updatedHandover, error: updateError } = await adminSupabase
      .from('handovers')
      .update({
        status: 'awaiting_buyer_signature',
        documents_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', handoverId)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to update handover status')
    }

    const property = handover.properties as any
    let buyerNotified = false
    let adminNotified = false

    // Notify buyer
    try {
      await notificationHelpers.handoverDocumentsUploaded({
        buyerId: handover.buyer_id,
        propertyId: handover.property_id,
        propertyTitle: property?.title || 'Property',
        handoverId,
        documentsCount: docCount,
      })
      buyerNotified = true
    } catch (notifError) {
      console.error('Failed to send buyer notification:', notifError)
    }

    // Notify admins
    try {
      const { data: admins } = await adminSupabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(5)

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await notificationHelpers.handoverDocumentsUploadedAdmin({
            adminId: admin.id,
            developerId: currentUser.id,
            propertyId: handover.property_id,
            propertyTitle: property?.title || 'Property',
            handoverId,
            documentsCount: docCount,
          })
        }
        adminNotified = true
      }
    } catch (notifError) {
      console.error('Failed to send admin notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      handover: updatedHandover,
      notificationsSent: {
        buyer: buyerNotified,
        admin: adminNotified,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
