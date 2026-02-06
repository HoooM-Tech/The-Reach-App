import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { SociaVaultService } from '@/lib/social-media/sociavault'

// Run monthly to update creator tiers
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const adminSupabase = createAdminSupabaseClient()

    // Get all creators with social accounts
    // First get all creators
    const { data: creators, error: creatorsError } = await adminSupabase
      .from('users')
      .select('id, tier')
      .eq('role', 'creator')

    if (creatorsError) {
      console.error('Error fetching creators:', creatorsError)
      throw creatorsError
    }

    if (!creators || creators.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        failed: 0,
        total: 0,
        message: 'No creators found',
      })
    }

    // Get social accounts for all creators
    const { data: socialAccounts, error } = await adminSupabase
      .from('social_accounts')
      .select('user_id, platform, handle')
      .in('user_id', creators.map(c => c.id))

    if (error) {
      console.error('Error fetching social accounts:', error)
      throw error
    }

    // Group social accounts by user_id
    const socialLinksByUser: Record<string, { instagram?: string; tiktok?: string; twitter?: string }> = {}
    
    socialAccounts?.forEach(account => {
      if (!socialLinksByUser[account.user_id]) {
        socialLinksByUser[account.user_id] = {}
      }
      
      // Construct URL from platform and handle
      const baseUrls: Record<string, string> = {
        instagram: 'https://instagram.com/',
        tiktok: 'https://tiktok.com/@',
        twitter: 'https://twitter.com/',
      }
      
      const url = baseUrls[account.platform] + account.handle
      if (account.platform === 'instagram') {
        socialLinksByUser[account.user_id].instagram = url
      } else if (account.platform === 'tiktok') {
        socialLinksByUser[account.user_id].tiktok = url
      } else if (account.platform === 'twitter') {
        socialLinksByUser[account.user_id].twitter = url
      }
    })

    let updated = 0
    let failed = 0

    for (const creator of creators) {
      try {
        // Skip if no social links
        const socialLinks = socialLinksByUser[creator.id]
        if (!socialLinks || Object.keys(socialLinks).length === 0) {
          continue
        }

        const result = await SociaVaultService.verifyCreator(socialLinks)

        // Update tier regardless of value (tier 0 is valid for unqualified creators)
        if (result.success) {
          // CRITICAL: tier 0 means unqualified - store as NULL in database
          const tierValue = result.tier === 0 ? null : result.tier;
          
          // Update user tier
          await adminSupabase
            .from('users')
            .update({
              tier: tierValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', creator.id)

          // Store analytics history
          await adminSupabase.from('creator_analytics_history').insert({
            creator_id: creator.id,
            tier: result.tier,
            analytics_data: result.analytics,
            created_at: new Date().toISOString(),
          })

          updated++
        } else {
          failed++
          console.warn(`Creator ${creator.id} verification failed:`, result.errors)
        }
      } catch (err: any) {
        console.error(`Failed to update creator ${creator.id}:`, err.message)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      failed,
      total: creators.length,
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

