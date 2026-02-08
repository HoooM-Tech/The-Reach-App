import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'
import { notificationHelpers } from '@/lib/services/notification-helper'

export async function POST(
  req: NextRequest,
  { params }: { params: { handoverId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const handoverId = params.handoverId

    if (currentUser.role !== 'buyer' && currentUser.role !== 'admin') {
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

    // Verify buyer owns this handover
    if (currentUser.role !== 'admin' && handover.buyer_id !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check documents exist
    const { data: documents } = await adminSupabase
      .from('property_documents')
      .select('id')
      .eq('property_id', handover.property_id)

    if (!documents || documents.length === 0) {
      throw new ValidationError('No documents to sign')
    }

    // Mark documents as signed in document_vault
    const vaultDocs = documents.map((doc: any) => ({
      user_id: currentUser.id,
      property_id: handover.property_id,
      document_type: 'handover_signed',
      file_url: '',
      signed_at: new Date().toISOString(),
    }))

    await adminSupabase.from('document_vault').insert(vaultDocs)

    // Update handover status
    const { data: updatedHandover, error: updateError } = await adminSupabase
      .from('handovers')
      .update({
        status: 'buyer_signed',
        buyer_signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', handoverId)
      .select()
      .single()

    if (updateError) {
      throw new Error('Failed to update handover')
    }

    const property = handover.properties as any
    let developerNotified = false
    let adminNotified = false

    // Notify developer
    try {
      if (property?.developer_id) {
        await notificationHelpers.handoverDocumentsSigned({
          developerId: property.developer_id,
          buyerId: currentUser.id,
          buyerName: currentUser.full_name || 'Buyer',
          propertyId: handover.property_id,
          propertyTitle: property.title || 'Property',
          handoverId,
        })
        developerNotified = true
      }
    } catch (notifError) {
      console.error('Failed to send developer notification:', notifError)
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
          await notificationHelpers.handoverDocumentsSignedAdmin({
            adminId: admin.id,
            buyerId: currentUser.id,
            buyerName: currentUser.full_name || 'Buyer',
            propertyId: handover.property_id,
            propertyTitle: property.title || 'Property',
            handoverId,
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
        developer: developerNotified,
        admin: adminNotified,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
