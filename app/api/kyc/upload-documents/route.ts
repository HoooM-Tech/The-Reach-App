import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const uploadSchema = z.object({
  document_type: z.enum(['national_id', 'passport', 'drivers_license', 'business_registration']),
  file_url: z.string().url(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await req.json()
    const { document_type, file_url } = uploadSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Insert KYC document
    const { data, error } = await supabase
      .from('kyc_documents')
      .insert({
        user_id: user.id,
        document_type,
        file_url,
        verification_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw new ValidationError(error.message)
    }

    return NextResponse.json(
      {
        message: 'Document uploaded successfully',
        document: data,
      },
      { status: 201 }
    )
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

