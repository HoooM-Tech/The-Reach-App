import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    await requireAdmin()
    const transactionId = params.transactionId
    const supabase = createServerSupabaseClient()

    // Get escrow transaction
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (escrowError || !escrow) {
      throw new NotFoundError('Escrow transaction')
    }

    // Update handover status
    const { data: handover, error: handoverError } = await supabase
      .from('handovers')
      .select('*')
      .eq('transaction_id', transactionId)
      .single()

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    // Update handover to pending developer docs
    await supabase
      .from('handovers')
      .update({
        status: 'pending_developer_docs',
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq('id', handover.id)

    return NextResponse.json({
      message: 'Payment confirmed, handover workflow initiated',
      handover: {
        ...handover,
        status: 'pending_developer_docs',
        payment_confirmed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

