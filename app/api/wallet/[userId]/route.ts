import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

// Helper function to fetch transactions
async function fetchTransactions(userId: string) {
  const adminSupabase = createAdminSupabaseClient()
  const { data: transactions } = await adminSupabase
    .from('escrow_transactions')
    .select('*')
    .or(`buyer_id.eq.${userId},developer_id.eq.${userId},creator_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(10)
  return transactions || []
}

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  console.log('[Wallet API] Route handler started')
  
  try {
    // Log for debugging
    console.log('[Wallet API] GET request received:', {
      pathname: req.nextUrl.pathname,
      userId: params.userId,
      hasAuthHeader: !!req.headers.get('authorization') || !!req.headers.get('Authorization'),
    })

    let currentUser
    try {
      console.log('[Wallet API] Attempting authentication...')
      currentUser = await getAuthenticatedUser()
      console.log('[Wallet API] Authenticated user:', { id: currentUser.id, role: currentUser.role })
    } catch (authError: any) {
      console.error('[Wallet API] Authentication error:', {
        message: authError?.message,
        name: authError?.name,
        stack: authError?.stack,
      })
      const { error: errorMessage, statusCode } = handleError(authError)
      console.error('[Wallet API] Returning error response:', { errorMessage, statusCode })
      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }

    const userId = params.userId

    // Users can only view their own wallet
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      console.log('[Wallet API] Access denied:', { currentUserId: currentUser.id, requestedUserId: userId })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminSupabaseClient() // Use admin client to bypass RLS for wallet queries
    console.log('[Wallet API] Fetching wallet for user:', userId)

    // Get wallet using admin client to bypass RLS
    const { data: wallet, error } = await adminSupabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Check if error is "not found" (PGRST116) vs other errors
    const isNotFoundError = error?.code === 'PGRST116'

    if (isNotFoundError && !wallet) {
      console.log('[Wallet API] Wallet not found, creating new wallet.')
      // Create wallet if it doesn't exist - use admin client to bypass RLS
      const { data: newWallet, error: createError } = await adminSupabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          locked_balance: 0,
        })
        .select()
        .single()

      if (createError) {
        // Handle duplicate key error (wallet was created between check and insert, or RLS issue)
        if (createError.code === '23505') {
          console.log('[Wallet API] Wallet already exists (race condition), fetching it.')
          // Fetch the existing wallet
          const { data: existingWallet, error: fetchError } = await adminSupabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single()
          
          if (fetchError || !existingWallet) {
            console.error('[Wallet API] Failed to fetch existing wallet:', fetchError)
            throw new NotFoundError('Wallet')
          }
          
          // Continue with existing wallet
          const transactions = await fetchTransactions(userId)
          return NextResponse.json({
            wallet: existingWallet,
            recent_transactions: transactions || [],
          })
        }
        
        console.error('[Wallet API] Failed to create wallet:', createError)
        throw new NotFoundError('Wallet')
      }

      console.log('[Wallet API] Created new wallet:', newWallet?.id)
      const transactions = await fetchTransactions(userId)
      return NextResponse.json({
        wallet: newWallet,
        recent_transactions: transactions || [],
      })
    } else if (error && !isNotFoundError) {
      // Other database error
      console.error('[Wallet API] Error fetching wallet:', error)
      throw new NotFoundError('Wallet')
    }

    console.log('[Wallet API] Found existing wallet:', wallet.id)

    // Validate userId is UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error('Invalid user ID format')
    }

    // Get recent transactions
    const transactions = await fetchTransactions(userId)

    return NextResponse.json({
      wallet,
      recent_transactions: transactions || [],
    })
  } catch (error) {
    console.error('[Wallet API] Error in route handler:', error)
    const { error: errorMessage, statusCode } = handleError(error)
    console.error('[Wallet API] Error response:', { errorMessage, statusCode })
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

