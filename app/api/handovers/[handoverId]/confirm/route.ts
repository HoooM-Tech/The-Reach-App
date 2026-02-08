import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError } from '@/lib/utils/errors'
import { createNotification } from '@/lib/services/notification-helper'

/**
 * POST - Developer confirms handover delivery OR Buyer confirms receipt
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { handoverId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const handoverId = params.handoverId

    const adminSupabase = createAdminSupabaseClient()

    // Get handover with property
    const { data: handover, error: handoverError } = await adminSupabase
      .from('handovers')
      .select('*, properties(id, title, developer_id, asking_price)')
      .eq('id', handoverId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    const property = handover.properties as any

    // Developer confirms handover
    if (currentUser.role === 'developer' || 
        (currentUser.role === 'admin' && currentUser.id === handover.developer_id)) {
      
      // Verify developer owns this handover
      if (currentUser.role !== 'admin' && handover.developer_id !== currentUser.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: updatedHandover, error: updateError } = await adminSupabase
        .from('handovers')
        .update({
          status: 'awaiting_buyer_confirmation',
          developer_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', handoverId)
        .select()
        .single()

      if (updateError) {
        throw new Error('Failed to update handover')
      }

      // Notify buyer to confirm receipt
      try {
        await createNotification(
          handover.buyer_id,
          'developer_confirmed_handover',
          'Please Confirm Receipt',
          `Developer has confirmed handover for "${property?.title || 'Property'}". Please confirm you have received the keys and documents.`,
          {
            handover_id: handoverId,
            property_id: handover.property_id,
            property_title: property?.title,
          },
          ['in_app', 'push', 'email']
        )
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

        if (admins) {
          for (const admin of admins) {
            await createNotification(
              admin.id,
              'developer_confirmed_handover_admin',
              'Developer Confirmed Handover',
              `Developer confirmed handover for "${property?.title || 'Property'}". Awaiting buyer confirmation.`,
              {
                handover_id: handoverId,
                property_id: handover.property_id,
                property_title: property?.title,
                developer_id: handover.developer_id,
              },
              ['in_app', 'push']
            )
          }
        }
      } catch (notifError) {
        console.error('Failed to send admin notification:', notifError)
      }

      return NextResponse.json({
        success: true,
        handover: updatedHandover,
        status: 'awaiting_buyer_confirmation',
      })
    }

    // Buyer confirms receipt
    if (currentUser.role === 'buyer' || currentUser.id === handover.buyer_id) {
      if (handover.buyer_id !== currentUser.id && currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: updatedHandover, error: updateError } = await adminSupabase
        .from('handovers')
        .update({
          status: 'completed',
          buyer_confirmed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', handoverId)
        .select()
        .single()

      if (updateError) {
        throw new Error('Failed to update handover')
      }

      // Notify developer about completion and payout
      try {
        const buyerName = currentUser.full_name || 'Buyer'
        const amount = property?.asking_price || 0

        await createNotification(
          handover.developer_id,
          'handover_complete_payout',
          'Handover Complete - Payout Processing',
          `Congratulations! ${buyerName} has confirmed receipt. Your payout is being processed.`,
          {
            handover_id: handoverId,
            property_id: handover.property_id,
            property_title: property?.title,
            buyer_name: buyerName,
            amount,
          },
          ['in_app', 'push', 'email']
        )
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

        if (admins) {
          for (const admin of admins) {
            await createNotification(
              admin.id,
              'handover_completed_admin',
              'Handover Completed - Process Payout',
              `Handover for "${property?.title || 'Property'}" completed. Process developer payout.`,
              {
                handover_id: handoverId,
                property_id: handover.property_id,
                property_title: property?.title,
                developer_id: handover.developer_id,
                buyer_id: handover.buyer_id,
              },
              ['in_app', 'push', 'email']
            )
          }
        }
      } catch (notifError) {
        console.error('Failed to send admin notification:', notifError)
      }

      return NextResponse.json({
        success: true,
        handover: updatedHandover,
        status: 'completed',
      })
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
