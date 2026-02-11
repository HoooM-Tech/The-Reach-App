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

    const out: any = { transaction }
    if (transaction.property_id && (transaction.category === 'property_purchase' || (transaction.metadata as any)?.payment_type === 'property_purchase')) {
      const { data: property } = await adminSupabase.from('properties').select('id, title, developer_id').eq('id', transaction.property_id).single()
      if (property?.developer_id) {
        const { data: dev } = await adminSupabase.from('users').select('id, full_name').eq('id', property.developer_id).single()
        out.propertyTitle = property.title
        out.developerName = dev?.full_name || 'Developer'
      }
    }
    return NextResponse.json(out)
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
