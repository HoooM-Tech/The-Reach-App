import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/client'
import { requireAdmin } from '@/lib/utils/auth'
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors'

/**
 * Create Supabase Auth user for an existing database user
 * This is useful when users were created manually in the database
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin()
    const userId = params.userId
    const body = await req.json()
    const { password } = body

    if (!password || password.length < 8) {
      throw new ValidationError('Password is required and must be at least 8 characters')
    }

    const supabase = createAdminSupabaseClient()

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new NotFoundError('User')
    }

    // Check if user already exists in auth
    const { data: existingAuthUser } = await supabase.auth.admin.getUserById(userId)

    if (existingAuthUser?.user) {
      // Update password if user exists
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true, // Auto-confirm email
      })

      if (updateError) {
        throw new ValidationError(`Failed to update auth user: ${updateError.message}`)
      }

      return NextResponse.json({
        message: 'Auth user password updated successfully',
        user_id: userId,
      })
    }

    // Create new auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      id: userId, // Use the same ID from database
      email: user.email,
      password: password,
      phone: user.phone || undefined,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
      },
    })

    if (authError) {
      throw new ValidationError(`Failed to create auth user: ${authError.message}`)
    }

    return NextResponse.json({
      message: 'Auth user created successfully',
      user_id: userId,
      auth_user_id: authData.user.id,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

