import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { handleError } from '@/lib/utils/errors'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const supabase = createServerSupabaseClient()

    // Get pending KYC documents
    const { data: kycDocuments, error } = await supabase
      .from('kyc_documents')
      .select('*, users(id, full_name, email, role)')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      kyc_documents: kycDocuments || [],
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

