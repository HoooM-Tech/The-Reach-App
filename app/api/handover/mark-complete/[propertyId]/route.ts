import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    await requireAdmin()
    const propertyId = params.propertyId
    const supabase = createServerSupabaseClient()

    // Get handover
    const { data: handover, error: handoverError } = await supabase
      .from('handovers')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    // Get escrow transaction separately
    const { data: escrow } = handover?.transaction_id
      ? await supabase
          .from('escrow_transactions')
          .select('*')
          .eq('id', handover.transaction_id)
          .single()
      : { data: null }

    if (handoverError || !handover) {
      throw new NotFoundError('Handover')
    }

    // Verify all obligations are met
    const obligationsMet =
      handover.documents_verified_at &&
      handover.keys_released_at &&
      handover.buyer_signed_at &&
      handover.keys_delivered_at

    if (!obligationsMet) {
      throw new ValidationError('Cannot complete handover: obligations not met')
    }

    // Release escrow
    if (escrow && escrow.status === 'held') {
      const splits = escrow.splits as any

      // Credit wallets
      if (splits.developer_amount > 0) {
        const { data: devWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', handover.developer_id)
          .single()

        if (devWallet) {
          await supabase
            .from('wallets')
            .update({ balance: (devWallet.balance || 0) + splits.developer_amount })
            .eq('user_id', handover.developer_id)
        } else {
          await supabase.from('wallets').insert({
            user_id: handover.developer_id,
            balance: splits.developer_amount,
            locked_balance: 0,
          })
        }
      }

      if (splits.creator_amount > 0 && handover.creator_id) {
        const { data: creatorWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', handover.creator_id)
          .single()

        if (creatorWallet) {
          await supabase
            .from('wallets')
            .update({ balance: (creatorWallet.balance || 0) + splits.creator_amount })
            .eq('user_id', handover.creator_id)
        } else {
          await supabase.from('wallets').insert({
            user_id: handover.creator_id,
            balance: splits.creator_amount,
            locked_balance: 0,
          })
        }
      }

      // Update escrow status
      await supabase
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', escrow.id)
    }

    // Mark handover as complete
    await supabase
      .from('handovers')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', handover.id)

    return NextResponse.json({
      message: 'Handover completed successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

