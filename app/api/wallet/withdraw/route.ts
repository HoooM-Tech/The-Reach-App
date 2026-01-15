import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { walletWithdrawSchema } from '@/lib/utils/validation'
import { ValidationError, handleError } from '@/lib/utils/errors'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await req.json()
    const validated = walletWithdrawSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      throw new ValidationError('Wallet not found')
    }

    // Check available balance
    const availableBalance = wallet.balance - wallet.locked_balance

    if (validated.amount > availableBalance) {
      throw new ValidationError('Insufficient balance')
    }

    if (validated.amount < 5000) {
      throw new ValidationError('Minimum withdrawal amount is ₦5,000')
    }

    // Create payout request
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        user_id: user.id,
        amount: validated.amount,
        status: 'requested',
        bank_account: validated.bank_account,
      })
      .select()
      .single()

    if (payoutError) {
      throw new ValidationError(payoutError.message)
    }

    // Lock the amount in wallet
    await supabase
      .from('wallets')
      .update({ locked_balance: (wallet.locked_balance || 0) + validated.amount })
      .eq('user_id', user.id)

    return NextResponse.json(
      {
        message: 'Withdrawal request submitted',
        payout,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

