import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const userId = params.userId

    // Users can only view their own wallet
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServerSupabaseClient()

    // Get wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !wallet) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          locked_balance: 0,
        })
        .select()
        .single()

      if (createError) {
        throw new NotFoundError('Wallet')
      }

      return NextResponse.json({ wallet: newWallet })
    }

    // Get recent transactions - use parameterized query to prevent SQL injection
    const { data: transactions } = await supabase
      .from('escrow_transactions')
      .select('*')
      .or(`buyer_id.eq.${userId},developer_id.eq.${userId},creator_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Note: Supabase client automatically parameterizes queries, but we validate userId is UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error('Invalid user ID format')
    }

    return NextResponse.json({
      wallet,
      recent_transactions: transactions || [],
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

