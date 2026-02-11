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

    const status = (inspection.status || '').toLowerCase()
    if (status !== 'completed') {
      throw new ValidationError('Property purchase is only available after the inspection is completed')
    }

    const property = inspection.properties as any
    const amount = Number(property?.asking_price || 0)
    if (!amount || Number.isNaN(amount)) {
      throw new ValidationError('Property price is not available')
    }

    const { count: existingPay } = await adminSupabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .eq('property_id', property.id)
      .eq('category', 'property_purchase')
      .in('status', ['successful', 'completed'])
    if ((existingPay ?? 0) > 0) {
      throw new ValidationError('This property has already been paid for')
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
    const reference = generateTransactionReference('property_purchase')

    const transactionPayload: any = {
      wallet_id: wallet?.id,
      user_id: authUser.id,
      type: 'debit',
      category: 'property_purchase',
      amount: totalAmount,
      fee: vat,
      total_amount: totalAmount,
      net_amount: totalAmount,
      currency: 'NGN',
      title: 'Property Purchase',
      description: 'Property Purchase',
      reference,
      status: 'pending',
      property_id: property?.id,
      payment_gateway: payment_method === 'paystack' ? 'paystack' : 'wallet',
      metadata: {
        payment_type: 'property_purchase',
        property_id: property?.id,
        developer_id: property?.developer_id,
        buyer_id: authUser.id,
        inspection_id: inspectionId,
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

    const propertyTitle = (property?.title || 'Property').trim()
    const narration = `Property Purchase – ${propertyTitle}`

    const paymentResponse = await initializePayment({
      email: authUser.email || '',
      amount: Math.round(totalAmount * 100),
      reference,
      metadata: {
        payment_type: 'property_purchase',
        property_id: property?.id,
        developer_id: property?.developer_id,
        buyer_id: authUser.id,
        inspection_id: inspectionId,
        transaction_id: transaction.id,
        narration,
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
