import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { requireCreator } from '@/lib/utils/auth'
import { ValidationError, handleError } from '@/lib/utils/errors'
import { SociaVaultService } from '@/lib/social-media/sociavault'

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

    // Validate at least one social link is provided
    if (!socialLinks.instagram && !socialLinks.tiktok && !socialLinks.twitter) {
      return NextResponse.json(
        { error: 'At least one social media profile is required' },
        { status: 400 }
      )
    }

    // Use SociaVault to verify creator profiles
    console.log('Verifying profiles with SociaVault:', {
      instagram: socialLinks.instagram ? 'provided' : 'missing',
      tiktok: socialLinks.tiktok ? 'provided' : 'missing',
      twitter: socialLinks.twitter ? 'provided' : 'missing',
      receivedData: {
        instagram: socialLinks.instagram,
        tiktok: socialLinks.tiktok,
        twitter: socialLinks.twitter,
      },
    })

    const verificationResult = await SociaVaultService.verifyCreator(socialLinks)

    console.log('Verification result:', {
      success: verificationResult.success,
      tier: verificationResult.tier,
      analyticsKeys: Object.keys(verificationResult.analytics),
      errors: verificationResult.errors,
      qualityScore: verificationResult.qualityScore,
    })

    // Allow partial success - if at least one platform succeeds, proceed
    if (!verificationResult.success || Object.keys(verificationResult.analytics).length === 0) {
      // Check if errors are profile-not-found vs API configuration issues
      const hasProfileNotFoundErrors = verificationResult.errors.some(err =>
        err.toLowerCase().includes('profile not found') ||
        err.toLowerCase().includes('not found') ||
        err.toLowerCase().includes('may be private')
      )

      const hasApiConfigErrors = verificationResult.errors.some(err =>
        err.includes('SOCIAVAULT_API_KEY') ||
        err.includes('not set')
      )

      return NextResponse.json(
        {
          success: false,
          error: hasApiConfigErrors
            ? 'Social media verification service is not configured. Please contact support.'
            : hasProfileNotFoundErrors
              ? 'Social media profile not found. Please verify your username is correct and the account exists and is public.'
              : 'Failed to verify social profiles',
          details: verificationResult.errors.length > 0
            ? verificationResult.errors
            : ['No valid social media profiles could be verified'],
          troubleshooting: hasApiConfigErrors ? {
            message: 'Service Configuration Issue',
            steps: [
              '1. SociaVault service is not properly configured',
              '2. Please contact support to enable social media verification',
              '3. You can use the manual social account linking feature as an alternative'
            ]
          } : hasProfileNotFoundErrors ? {
            message: 'Profile Not Found',
            steps: [
              '1. Double-check that your username is spelled correctly',
              '2. Verify the account exists and is public (not private)',
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
    for (const [platform, analytics] of Object.entries(verificationResult.analytics)) {
      // Extract username from analytics data
      const username = analytics.username || '';
      
      // Check if account already exists
      const { data: existing } = await adminSupabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', creator.id)
        .eq('platform', platform)
        .single()

      if (existing) {
        // Update existing
        await adminSupabase
          .from('social_accounts')
          .update({
            handle: username,
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
            platform: platform as 'instagram' | 'tiktok' | 'twitter',
            handle: username,
            followers: analytics.followers,
            engagement_rate: analytics.engagementRate,
            verified_at: new Date().toISOString(),
          })
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

    // Calculate commission rate
    const commissionRates: Record<number, string> = {
      1: '3.0%',
      2: '2.5%',
      3: '2.0%',
      4: '1.5%',
    };

    return NextResponse.json({
      success: true,
      tier: verificationResult.tier,
      qualityScore: verificationResult.qualityScore,
      commission: commissionRates[verificationResult.tier] || '0%',
      analytics: verificationResult.analytics,
      warnings: verificationResult.errors.length > 0 ? verificationResult.errors : undefined,
      message: `Congratulations! You've been verified as a Tier ${verificationResult.tier} creator`,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

