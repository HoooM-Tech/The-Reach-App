// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { handleError } from '@/lib/utils/errors'

export async function POST(req: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      message: 'Logout successful',
    })

    // Supabase SSR handles cookie clearing automatically
    // No manual cookie deletion needed

    return response
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
