import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireDeveloper } from '@/lib/utils/auth'
import { contractSignSchema } from '@/lib/utils/validation'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'
import { signDocument } from '@/lib/utils/crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const developer = await requireDeveloper()
    const contractId = params.contractId
    const body = await req.json()
    const { signature } = contractSignSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Get contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts_of_sale')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      throw new NotFoundError('Contract')
    }

    if (contract.developer_id !== developer.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (contract.status !== 'pending_developer_signature') {
      throw new ValidationError('Contract is not in a state that allows developer signature')
    }

    // Generate digital signature
    const digitalSignature = signDocument(contractId, developer.id, 'developer')
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Update contract
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts_of_sale')
      .update({
        developer_signature: digitalSignature,
        developer_signed_at: new Date().toISOString(),
        developer_ip_address: clientIP,
        status: 'signed_by_developer',
      })
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      throw new ValidationError(updateError.message)
    }

    return NextResponse.json({
      message: 'Contract signed successfully',
      contract: updatedContract,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

