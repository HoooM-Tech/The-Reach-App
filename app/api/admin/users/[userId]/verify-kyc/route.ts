import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const admin = await requireAdmin()
    const userId = params.userId
    const body = await req.json()
    const { action, reason } = body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      throw new ValidationError('Invalid action. Must be "approve" or "reject"')
    }

    const supabase = createServerSupabaseClient()

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new NotFoundError('User')
    }

    // Update KYC status
    const kycStatus = action === 'approve' ? 'verified' : 'rejected'

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        kyc_status: kycStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      throw new ValidationError(updateError.message)
    }

    return NextResponse.json({
      message: `User KYC ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      user: updatedUser,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

