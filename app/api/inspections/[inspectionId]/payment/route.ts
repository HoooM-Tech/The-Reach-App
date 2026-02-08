import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors'
import { initializePayment } from '@/lib/services/paystack'
import { generateTransactionReference } from '@/lib/utils/transaction-reference'

export async function POST(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const routeSupabase = createRouteHandlerClient()
    const { data: { user: authUser }, error: authError } = await routeSupabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const inspectionId = params.inspectionId
    const { payment_method, billing_address } = await req.json()

    if (!payment_method || !['wallet', 'paystack'].includes(payment_method)) {
      throw new ValidationError('Invalid payment method')
    }

    const adminSupabase = createAdminSupabaseClient()

    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(id, title, asking_price, developer_id)')
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection')
    }

    if (inspection.buyer_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const property = inspection.properties as any
    const amount = Number(property?.asking_price || 0)
    if (!amount || Number.isNaN(amount)) {
      throw new ValidationError('Property price is not available')
    }

    // Get or create wallet
    let { data: wallet, error: walletError } = await adminSupabase
      .from('wallets')
      .select('id, user_id, available_balance, locked_balance, is_setup, user_type')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError
    }

    if (!wallet) {
      const { data: newWallet, error: createError } = await adminSupabase
        .from('wallets')
        .insert({
          user_id: authUser.id,
          user_type: 'buyer',
          available_balance: 0,
          locked_balance: 0,
          is_setup: false,
        })
        .select()
        .single()

      if (createError) throw createError
      wallet = newWallet
    }

    const vat = Math.round(amount * 0.075 * 100) / 100
    const totalAmount = amount + vat
    const reference = generateTransactionReference('withdrawal')

    const transactionPayload: any = {
      wallet_id: wallet?.id,
      user_id: authUser.id,
      type: 'debit',
      category: 'withdrawal',
      amount: totalAmount,
      fee: vat,
      total_amount: totalAmount,
      net_amount: totalAmount,
      currency: 'NGN',
      title: 'Inspection Payment',
      description: `Inspection payment for ${property?.title || 'property'}`,
      reference,
      status: 'pending',
      property_id: property?.id,
      payment_gateway: payment_method === 'paystack' ? 'paystack' : 'wallet',
      metadata: {
        inspection_id: inspectionId,
        property_id: property?.id,
        developer_id: property?.developer_id,
        billing_address,
        vat,
      },
    }

    const { data: transaction, error: transactionError } = await adminSupabase
      .from('transactions')
      .insert(transactionPayload)
      .select()
      .single()

    if (transactionError) {
      throw transactionError
    }

    if (payment_method === 'wallet') {
      return NextResponse.json({
        message: 'Payment initialized',
        transaction,
      })
    }

    const callbackUrl =
      process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/buyer/inspections/${inspectionId}/payment/success?reference=${reference}&transactionId=${transaction.id}`
        : undefined

    const paymentResponse = await initializePayment({
      email: authUser.email || '',
      amount: Math.round(totalAmount * 100),
      reference,
      metadata: {
        inspection_id: inspectionId,
        transaction_id: transaction.id,
      },
      callback_url: callbackUrl,
    })

    await adminSupabase
      .from('transactions')
      .update({
        authorization_url: paymentResponse.data.authorization_url,
        access_code: paymentResponse.data.access_code,
        gateway_reference: paymentResponse.data.reference,
        paystack_reference: paymentResponse.data.reference,
      })
      .eq('id', transaction.id)

    return NextResponse.json({
      message: 'Payment initialized',
      transaction,
      authorization_url: paymentResponse.data.authorization_url,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
