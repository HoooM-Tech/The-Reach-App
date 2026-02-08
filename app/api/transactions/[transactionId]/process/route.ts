import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'
import { logWalletActivity } from '@/lib/utils/wallet-activity'
import { notificationHelpers } from '@/lib/services/notification-helper'

export async function POST(
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
      .select('*, wallets!inner(*)')
      .eq('id', params.transactionId)
      .eq('user_id', authUser.id)
      .single()

    if (transactionError || !transaction) {
      throw new NotFoundError('Transaction')
    }

    if (transaction.status !== 'pending') {
      throw new ValidationError('Transaction cannot be processed')
    }

    if (transaction.payment_gateway !== 'wallet') {
      throw new ValidationError('Transaction is not a wallet payment')
    }

    const wallet = transaction.wallets
    const totalAmount = parseFloat(transaction.amount || 0)
    const availableBalance = parseFloat(wallet.available_balance || 0)

    if (availableBalance < totalAmount) {
      throw new ValidationError('Insufficient wallet balance')
    }

    const { error: balanceError } = await adminSupabase
      .from('wallets')
      .update({
        available_balance: (availableBalance - totalAmount).toFixed(2),
      })
      .eq('id', wallet.id)
      .eq('available_balance', wallet.available_balance)

    if (balanceError) {
      throw new ValidationError('Failed to update balance. Please try again.')
    }

    const { data: updatedTransaction, error: updateError } = await adminSupabase
      .from('transactions')
      .update({
        status: 'successful',
        completed_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)
      .select()
      .single()

    if (updateError) {
      throw new ValidationError('Failed to update transaction')
    }

    try {
      await logWalletActivity({
        wallet_id: wallet.id,
        user_id: transaction.user_id || wallet.user_id,
        action: 'inspection_payment',
        previous_balance: availableBalance,
        new_balance: availableBalance - totalAmount,
        amount_changed: totalAmount,
        transaction_id: transaction.id,
        description: `Inspection payment of ${totalAmount} NGN`,
      })
    } catch (logError) {
      console.error('Error logging wallet activity:', logError)
    }

    try {
      const metadata = (transaction.metadata as any) || {}
      if (metadata?.property_id && metadata?.inspection_id) {
        const { data: property } = await adminSupabase
          .from('properties')
          .select('id, title, developer_id')
          .eq('id', metadata.property_id)
          .single()

        if (property?.developer_id) {
          await notificationHelpers.inspectionPaymentCompleted({
            buyerId: authUser.id,
            developerId: property.developer_id,
            propertyId: property.id,
            propertyTitle: property.title,
            inspectionId: metadata.inspection_id,
            amount: totalAmount,
            transactionId: transaction.id,
          })
        }
      }
    } catch (notifError) {
      console.error('Failed to send payment notification:', notifError)
    }

    return NextResponse.json({
      message: 'Payment completed',
      transaction: updatedTransaction,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
