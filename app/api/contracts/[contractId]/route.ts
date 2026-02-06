import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const user = await getAuthenticatedUser()
    const contractId = params.contractId
    const supabase = createServerSupabaseClient()

    // Get contract
    const { data: contract, error } = await supabase
      .from('contracts_of_sale')
      .select('*, properties(*), users!contracts_of_sale_developer_id_fkey(*)')
      .eq('id', contractId)
      .single()

    if (error || !contract) {
      throw new NotFoundError('Contract')
    }

    // Verify access (developer, admin, or buyer if property is sold to them)
    const isDeveloper = contract.developer_id === user.id
    const isAdmin = user.role === 'admin'

    if (!isDeveloper && !isAdmin) {
      // Check if user is the buyer
      const { data: handover } = await supabase
        .from('handovers')
        .select('buyer_id')
        .eq('property_id', contract.property_id)
        .eq('buyer_id', user.id)
        .single()

      if (!handover) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({
      contract,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

