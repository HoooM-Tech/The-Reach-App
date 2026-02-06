import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { kycId: string } }
) {
  try {
    const admin = await requireAdmin()
    const kycId = params.kycId
    const supabase = createServerSupabaseClient()

    // Get KYC document
    const { data: kycDoc, error: kycError } = await supabase
      .from('kyc_documents')
      .select('*, users(*)')
      .eq('id', kycId)
      .single()

    if (kycError || !kycDoc) {
      throw new NotFoundError('KYC document')
    }

    // Update KYC document status
    await supabase
      .from('kyc_documents')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: admin.id,
      })
      .eq('id', kycId)

    // Check if all KYC documents for user are verified
    const { data: allDocs } = await supabase
      .from('kyc_documents')
      .select('verification_status')
      .eq('user_id', kycDoc.user_id)

    const allVerified = allDocs?.every((doc) => doc.verification_status === 'verified')

    if (allVerified) {
      // Update user KYC status
      await supabase
        .from('users')
        .update({ kyc_status: 'verified' })
        .eq('id', kycDoc.user_id)
    }

    return NextResponse.json({
      message: 'KYC document approved successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

