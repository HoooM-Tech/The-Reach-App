import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/utils/auth'
import { ValidationError, handleError } from '@/lib/utils/errors'
import type { SocialMetrics } from '@/lib/utils/tier-calculator'
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
  // Import aggregated tier calculator
  const { calculateTier } = await import('@/lib/utils/tier-calculator')

  // Get all verified social accounts
  const { data: socialAccounts } = await supabase
    .from('social_accounts')
    .select('platform, followers, engagement_rate')
    .eq('user_id', userId)
    .not('verified_at', 'is', null)

  if (!socialAccounts || socialAccounts.length === 0) {
    // No verified social accounts = tier null (unqualified)
    await supabase
      .from('users')
      .update({ tier: null })
      .eq('id', userId)
    return
  }

  type SocialAccountRow = {
    platform: string
    followers: number | null
    engagement_rate: number | null
  }

  // Build metrics object from ALL verified accounts (aggregated)
  const metrics: SocialMetrics = {}
  
  socialAccounts.forEach((account: SocialAccountRow) => {
    const platform = account.platform.toLowerCase()
    const followers = account.followers || 0
    const engagement = account.engagement_rate || 0
    // Following count not stored in DB, use 0 as default
    const following = 0
    
    if (platform === 'twitter' || platform === 'x') {
      metrics.twitter = {
        followers,
        following,
        engagement,
      }
    } else if (platform === 'instagram') {
      metrics.instagram = {
        followers,
        following,
        engagement,
      }
    } else if (platform === 'tiktok') {
      metrics.tiktok = {
        followers,
        engagement,
      }
    } else if (platform === 'facebook') {
      metrics.facebook = {
        followers,
        engagement,
      }
    }
  })

  console.log('📊 Recalculating tier with aggregated metrics:', {
    userId,
    metrics,
    totalAccounts: socialAccounts.length,
  })

  // Calculate tier using aggregated followers
  const tierResult = calculateTier(metrics)

  console.log('🎯 Tier recalculation result:', {
    userId,
    tier: tierResult.tier,
    tierName: tierResult.tierName,
    totalFollowers: tierResult.totalFollowers,
    engagementRate: tierResult.engagementRate,
    qualityScore: tierResult.qualityScore,
  })

  // CRITICAL: tier null (disqualified) should be stored as NULL in database
  const tierValue = tierResult.tier === null ? null : tierResult.tier

  await supabase
    .from('users')
    .update({ tier: tierValue })
    .eq('id', userId)
}

