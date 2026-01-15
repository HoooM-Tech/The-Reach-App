import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { requireCreator } from '@/lib/utils/auth'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { SocialMediaAnalytics, parseSocialLinks } from '@/lib/services/social-media/analytics'

export async function POST(req: NextRequest) {
  try {
    const creator = await requireCreator()
    const body = await req.json()
    const { socialLinks } = body

    if (!socialLinks || (typeof socialLinks === 'object' && Object.keys(socialLinks).length === 0)) {
      return NextResponse.json(
        { error: 'At least one valid social media profile is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    // Parse social media URLs
    const profiles = parseSocialLinks(socialLinks)

    if (profiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid social media profile is required' },
        { status: 400 }
      )
    }

    // Verify all profiles and calculate tier
    console.log('Verifying profiles:', profiles.map(p => ({ platform: p.platform, username: p.username })))
    const verificationResult = await SocialMediaAnalytics.verifyCreatorProfiles(profiles)

    console.log('Verification result:', {
      success: verificationResult.success,
      tier: verificationResult.tier,
      analyticsKeys: Object.keys(verificationResult.analytics),
      errors: verificationResult.errors,
      analytics: verificationResult.analytics
    })

    // Allow partial success - if at least one platform succeeds, proceed
    if (!verificationResult.success || Object.keys(verificationResult.analytics).length === 0) {
      // Check if errors are profile-not-found vs API endpoint issues
      const hasProfileNotFoundErrors = verificationResult.errors.some(err =>
        err.toLowerCase().includes('profile not found') ||
        err.toLowerCase().includes('account may not exist') ||
        err.toLowerCase().includes('may be private')
      )

      const hasApiEndpointErrors = verificationResult.errors.some(err =>
        err.includes('404') && (err.includes('endpoint') || err.includes('API')) ||
        err.includes('not available') ||
        err.includes('not included in your RapidAPI subscription')
      )

      const isTwitterOnlyError = profiles.length === 1 && 
        profiles[0].platform === 'twitter' &&
        verificationResult.errors.some(err => err.includes('Twitter verification is not available'))

      return NextResponse.json(
        {
          success: false,
          error: isTwitterOnlyError
            ? 'Twitter verification is not available. Please use Instagram or TikTok for verification, or use the manual social account linking feature.'
            : hasProfileNotFoundErrors
              ? 'Social media profile not found. Please verify your username is correct and the account exists.'
              : hasApiEndpointErrors
                ? 'Social media API endpoints not found. Please check your RapidAPI configuration. The API endpoints may not be available in your subscription, or the endpoint paths may be incorrect.'
                : 'Failed to verify social profiles',
          details: verificationResult.errors.length > 0
            ? verificationResult.errors
            : ['No valid social media profiles could be verified'],
          troubleshooting: isTwitterOnlyError ? {
            message: 'Twitter Verification Not Available',
            steps: [
              '1. Twitter API is not available in the current RapidAPI subscription',
              '2. Please use Instagram or TikTok for verification instead',
              '3. You can also use the manual social account linking feature',
              '4. Contact support if you need Twitter verification enabled'
            ]
          } : hasApiEndpointErrors ? {
            message: 'RapidAPI Configuration Issue',
            steps: [
              '1. Verify your RAPIDAPI_KEY is set correctly in .env.local',
              '2. Check that your RapidAPI subscription includes the social media analytics APIs',
              '3. Verify the RAPIDAPI_HOST matches the API you subscribed to',
              '4. Check the RapidAPI documentation for the correct endpoint paths',
              '5. Consider using the manual social account linking feature as an alternative'
            ]
          } : hasProfileNotFoundErrors ? {
            message: 'Profile Not Found',
            steps: [
              '1. Double-check that your username is spelled correctly',
              '2. Verify the account exists and is public',
              '3. Try using the full profile URL instead of just the username',
              '4. If you recently created the account, wait a few hours for it to be indexed'
            ]
          } : undefined
        },
        { status: 400 }
      )
    }

    // Log warnings for failed platforms but don't block success
    if (verificationResult.errors.length > 0) {
      console.warn('Some social profiles failed to verify:', verificationResult.errors)
    }

    // Check if creator meets minimum requirements
    if (verificationResult.tier === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account does not meet minimum creator requirements',
          details: [
            'Minimum 5,000 followers required',
            'Minimum 1% engagement rate required',
            'Maximum 25% fake followers allowed',
          ],
          analytics: verificationResult.analytics,
        },
        { status: 400 }
      )
    }

    // Store social accounts in database
    for (const profile of profiles) {
      const analytics = verificationResult.analytics[profile.platform]
      if (analytics) {
        // Check if account already exists
        const { data: existing } = await adminSupabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', creator.id)
          .eq('platform', profile.platform)
          .single()

        if (existing) {
          // Update existing
          await adminSupabase
            .from('social_accounts')
            .update({
              handle: profile.username,
              followers: analytics.followers,
              engagement_rate: analytics.engagementRate,
              verified_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        } else {
          // Create new
          await adminSupabase
            .from('social_accounts')
            .insert({
              user_id: creator.id,
              platform: profile.platform,
              handle: profile.username,
              followers: analytics.followers,
              engagement_rate: analytics.engagementRate,
              verified_at: new Date().toISOString(),
            })
        }
      }
    }

    // Update user tier
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        tier: verificationResult.tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creator.id)

    if (updateError) {
      throw new ValidationError(updateError.message)
    }

    // Store analytics history
    await adminSupabase.from('creator_analytics_history').insert({
      creator_id: creator.id,
      tier: verificationResult.tier,
      analytics_data: verificationResult.analytics,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      tier: verificationResult.tier,
      analytics: verificationResult.analytics,
      warnings: verificationResult.errors.length > 0 ? verificationResult.errors : undefined,
      message: `Congratulations! You've been verified as a Tier ${verificationResult.tier} creator`,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

