import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/client'
import { requireCreator } from '@/lib/utils/auth'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { z } from 'zod'

const linkSocialSchema = z.object({
  platform: z.enum(['instagram', 'twitter', 'tiktok', 'youtube', 'facebook']),
  handle: z.string().min(1),
  followers: z.number().int().positive().optional(),
  engagement_rate: z.number().min(0).max(100).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const creator = await requireCreator()
    const body = await req.json()
    const { platform, handle, followers, engagement_rate } = linkSocialSchema.parse(body)

    const supabase = createServerSupabaseClient()

    // Check if social account already linked
    const { data: existing } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', creator.id)
      .eq('platform', platform)
      .single()

    if (existing) {
      // Update existing
      const { data: socialAccount, error } = await supabase
        .from('social_accounts')
        .update({
          handle,
          followers,
          engagement_rate,
          verified_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        throw new ValidationError(error.message)
      }

      // Recalculate tier based on social stats
      await recalculateCreatorTier(creator.id, supabase)

      return NextResponse.json({
        message: 'Social account updated successfully',
        social_account: socialAccount,
      })
    } else {
      // Create new
      const { data: socialAccount, error } = await supabase
        .from('social_accounts')
        .insert({
          user_id: creator.id,
          platform,
          handle,
          followers,
          engagement_rate,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new ValidationError(error.message)
      }

      // Recalculate tier based on social stats
      await recalculateCreatorTier(creator.id, supabase)

      return NextResponse.json(
        {
          message: 'Social account linked successfully',
          social_account: socialAccount,
        },
        { status: 201 }
      )
    }
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

async function recalculateCreatorTier(userId: string, supabase: any) {
  // Get all social accounts
  const { data: socialAccounts } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('user_id', userId)

  if (!socialAccounts || socialAccounts.length === 0) {
    return
  }

  // Use the new tier calculation logic from SocialMediaAnalytics
  // For manual entries, we'll use simplified logic
  let highestTier = 0

  for (const account of socialAccounts) {
    const followers = account.followers || 0
    const engagementRate = account.engagement_rate || 0
    const qualityScore = 70 // Default quality score for manual entries
    const fakeFollowerPercent = 10 // Default for manual entries

    // Apply tier calculation logic
    if (
      followers >= 100000 &&
      engagementRate >= 3.0 &&
      qualityScore >= 85 &&
      fakeFollowerPercent < 10
    ) {
      highestTier = Math.max(highestTier, 1)
    } else if (
      followers >= 50000 &&
      followers < 100000 &&
      engagementRate >= 2.0 &&
      qualityScore >= 70 &&
      fakeFollowerPercent < 15
    ) {
      highestTier = Math.max(highestTier, 2)
    } else if (
      followers >= 10000 &&
      followers < 50000 &&
      engagementRate >= 1.5 &&
      qualityScore >= 60 &&
      fakeFollowerPercent < 20
    ) {
      highestTier = Math.max(highestTier, 3)
    } else if (
      followers >= 5000 &&
      followers < 10000 &&
      engagementRate >= 1.0 &&
      qualityScore >= 50 &&
      fakeFollowerPercent < 25
    ) {
      highestTier = Math.max(highestTier, 4)
    }
  }

  // If no tier found, default to tier 4 (lowest)
  const tier = highestTier > 0 ? highestTier : 4

  // Update user tier
  await supabase
    .from('users')
    .update({ tier })
    .eq('id', userId)
}

