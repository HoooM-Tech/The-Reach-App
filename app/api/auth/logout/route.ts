import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { handleError } from '@/lib/utils/errors'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      message: 'Logout successful',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

