import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'

/**
 * POST /api/admin/transactions/:transactionId/create-handover
 * Manually trigger handover creation for a successful property payment (e.g. when webhook/callback missed).
 * Admin only.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    await requireAdmin()
    const adminSupabase = createAdminSupabaseClient()
    const transactionId = params.transactionId

    const { data: transaction, error: txError } = await adminSupabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction) {
      throw new NotFoundError('Transaction')
    }

    const meta = (transaction.metadata as any) || {}
    if (meta?.payment_type !== 'property_purchase') {
      throw new ValidationError('Transaction is not a property purchase')
    }

    if (transaction.status !== 'successful' && transaction.status !== 'completed') {
      throw new ValidationError('Transaction must be successful before creating handover. Verify payment first.')
    }

    const { data: existing } = await adminSupabase
      .from('handovers')
      .select('id, transaction_id')
      .eq('property_id', meta.property_id)
      .eq('buyer_id', meta.buyer_id || transaction.user_id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        success: true,
        handoverId: existing.id,
        message: 'Handover already exists for this payment',
      })
    }

    const { completePropertyPurchase } = await import('@/lib/utils/property-purchase-completion')
    const amount = parseFloat(transaction.amount || transaction.total_amount || '0')
    const { data: prop } = await adminSupabase.from('properties').select('title').eq('id', meta.property_id).single()
    const reference = transaction.gateway_reference || transaction.paystack_reference || transaction.reference

    const result = await completePropertyPurchase({
      transactionId: transaction.id,
      amount,
      propertyId: meta.property_id,
      developerId: meta.developer_id,
      buyerId: meta.buyer_id || transaction.user_id,
      inspectionId: meta.inspection_id,
      propertyTitle: prop?.title || 'Property',
      reference: reference || undefined,
    })

    return NextResponse.json({
      success: true,
      handoverId: result?.handoverId,
      escrowId: result?.escrowId,
      message: 'Handover created successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ success: false, error: errorMessage }, { status: statusCode })
  }
}
