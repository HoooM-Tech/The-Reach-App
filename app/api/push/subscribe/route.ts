import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await req.json()
    const subscription = subscriptionSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Store push subscription in database
    // Try to use push_subscriptions table first, fallback to users table
    const { error: tableError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint',
      })

    // If table doesn't exist, store in users table as fallback
    if (tableError && tableError.code === 'PGRST116') {
      const { error: userError } = await supabase
        .from('users')
        .update({
          push_subscription: subscription,
        })
        .eq('id', user.id)

      if (userError) {
        throw new ValidationError(userError.message)
      }
    } else if (tableError) {
      throw new ValidationError(tableError.message)
    }

    return NextResponse.json({
      message: 'Push subscription saved successfully',
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

