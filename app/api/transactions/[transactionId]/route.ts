import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { handleError, NotFoundError } from '@/lib/utils/errors'

export async function GET(
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
      .select('*')
      .eq('id', params.transactionId)
      .eq('user_id', authUser.id)
      .single()

    if (transactionError || !transaction) {
      throw new NotFoundError('Transaction')
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
