import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'
import { signDocument } from '@/lib/utils/crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const admin = await requireAdmin()
    const contractId = params.contractId
    const supabase = createServerSupabaseClient()

    // Get contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts_of_sale')
      .select('*, properties(*)')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      throw new NotFoundError('Contract')
    }

    if (contract.status !== 'signed_by_developer') {
      throw new ValidationError('Contract must be signed by developer first')
    }

    // Generate digital signature
    const digitalSignature = signDocument(contractId, admin.id, 'reach')

    // Update contract
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts_of_sale')
      .update({
        reach_signature: digitalSignature,
        reach_signed_at: new Date().toISOString(),
        reach_admin_id: admin.id,
        status: 'executed',
      })
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      throw new ValidationError(updateError.message)
    }

    // Update property status to active (now that contract is executed)
    await supabase
      .from('properties')
      .update({ status: 'active' })
      .eq('id', contract.property_id)

    return NextResponse.json({
      message: 'Contract countersigned by Reach',
      contract: updatedContract,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

