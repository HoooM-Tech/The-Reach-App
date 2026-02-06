import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const userId = params.userId

    // Users can only view their own KYC status (or admin can view any)
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to bypass RLS since we've already verified authorization
    const supabase = createAdminSupabaseClient()

    // Get user KYC status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new NotFoundError('User')
    }

    // Get KYC documents
    const { data: documents } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      kyc_status: user.kyc_status,
      documents: documents || [],
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

