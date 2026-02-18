import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { handleError, NotFoundError } from '@/lib/utils/errors'
import { verifyPayment } from '@/lib/services/paystack'

/**
 * GET /api/buyer/payment/verify/:reference
 * Verify Paystack payment by reference when buyer returns from redirect.
 * Finds transaction by reference + current user, verifies with Paystack, updates transaction and triggers handover.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const routeSupabase = createRouteHandlerClient()
    const { data: { user: authUser }, error: authError } = await routeSupabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const reference = params.reference?.trim()
    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()
    const { data: transaction, error: transactionError } = await adminSupabase
      .from('transactions')
      .select('*')
      .eq('user_id', authUser.id)
      .or(`reference.eq.${reference},paystack_reference.eq.${reference},gateway_reference.eq.${reference}`)
      .maybeSingle()

    if (transactionError || !transaction) {
      throw new NotFoundError('Transaction')
    }

    if (transaction.status === 'successful' || transaction.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'successful',
        amount: parseFloat(transaction.amount || transaction.total_amount || '0'),
        transaction,
        message: 'Payment already verified',
      })
    }

    const ref = transaction.gateway_reference || transaction.paystack_reference || transaction.reference
    if (!ref) {
      return NextResponse.json({ success: false, error: 'Reference not found' }, { status: 400 })
    }

    const paystackVerification = await verifyPayment(ref)
    if (!paystackVerification.status || paystackVerification.data?.status !== 'success') {
      return NextResponse.json({
        success: false,
        status: paystackVerification.data?.status || 'failed',
        message: 'Payment not successful on Paystack',
      }, { status: 400 })
    }

    const { data: updatedTransaction } = await adminSupabase
      .from('transactions')
      .update({
        status: 'successful',
        payment_gateway: 'paystack',
        gateway_reference: ref,
        paystack_reference: ref,
        paystack_status: 'success',
        completed_at: new Date().toISOString(),
        webhook_received: false,
        webhook_payload: paystackVerification.data,
        webhook_received_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)
      .select()
      .single()

    const meta = (updatedTransaction?.metadata as any) || {}
    if (meta?.payment_type === 'property_purchase' && meta?.property_id && meta?.developer_id && meta?.inspection_id) {
      try {
        const { completePropertyPurchase } = await import('@/lib/utils/property-purchase-completion')
        const amount = parseFloat(updatedTransaction?.amount || updatedTransaction?.total_amount || '0')
        const { data: prop } = await adminSupabase.from('properties').select('title').eq('id', meta.property_id).single()
        await completePropertyPurchase({
          transactionId: updatedTransaction?.id,
          amount,
          propertyId: meta.property_id,
          developerId: meta.developer_id,
          buyerId: authUser.id,
          inspectionId: meta.inspection_id,
          propertyTitle: prop?.title || 'Property',
          reference: ref,
        })
      } catch (e) {
        console.error('Payment verify: completePropertyPurchase error', e)
      }
    }

    return NextResponse.json({
      success: true,
      status: 'successful',
      amount: parseFloat(updatedTransaction?.amount || updatedTransaction?.total_amount || '0'),
      transaction: updatedTransaction,
      message: 'Payment verified successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode })
  }
}
