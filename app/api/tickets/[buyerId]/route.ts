import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { buyerId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const buyerId = params.buyerId

    // Verify access
    if (currentUser.id !== buyerId && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createServerSupabaseClient()

    // Get tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*, events(*)')
      .eq('buyer_id', buyerId)
      .order('purchase_date', { ascending: false })

    if (error) {
      throw new NotFoundError('Tickets')
    }

    return NextResponse.json({
      tickets: tickets || [],
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

