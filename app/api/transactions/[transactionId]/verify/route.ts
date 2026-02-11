import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { handleError, NotFoundError } from '@/lib/utils/errors'
import { verifyPayment } from '@/lib/services/paystack'

export async function GET(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const routeSupabase = createRouteHandlerClient()
    const { data: { user: authUser }, error: authError } = await routeSupabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const { data: transaction, error: transactionError } = await adminSupabase
      .from('transactions')
      .select('*')
      .eq('id', params.transactionId)
      .eq('user_id', authUser.id)
      .single()

    if (transactionError || !transaction) {
      throw new NotFoundError('Transaction')
    }

    if (transaction.status === 'successful') {
      return NextResponse.json({ transaction })
    }

    const reference = transaction.gateway_reference || transaction.paystack_reference || transaction.reference
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 400 })
    }

    const paystackVerification = await verifyPayment(reference)
    if (paystackVerification.status && paystackVerification.data?.status === 'success') {
      const { data: updatedTransaction } = await adminSupabase
        .from('transactions')
        .update({
          status: 'successful',
          payment_gateway: 'paystack',
          gateway_reference: reference,
          paystack_reference: reference,
          paystack_status: 'success',
          completed_at: new Date().toISOString(),
          webhook_received: false,
          webhook_payload: paystackVerification.data,
          webhook_received_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)
        .select()
        .single()

      try {
        const meta = (updatedTransaction?.metadata as any) || {}
        if (meta?.payment_type === 'property_purchase' && meta?.property_id && meta?.developer_id && meta?.inspection_id) {
          const { completePropertyPurchase } = await import('@/lib/utils/property-purchase-completion')
          const amount = parseFloat(updatedTransaction?.amount || 0)
          const { data: prop } = await adminSupabase.from('properties').select('title').eq('id', meta.property_id).single()
          await completePropertyPurchase({
            transactionId: updatedTransaction?.id,
            amount,
            propertyId: meta.property_id,
            developerId: meta.developer_id,
            buyerId: authUser.id,
            inspectionId: meta.inspection_id,
            propertyTitle: prop?.title || 'Property',
            reference,
          })
        }
      } catch (notifError) {
        console.error('Failed to complete property purchase:', notifError)
      }

      return NextResponse.json({ transaction: updatedTransaction })
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
