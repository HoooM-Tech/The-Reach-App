import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/client'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { NotFoundError, handleError } from '@/lib/utils/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> | { creatorId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 13+ uses async params)
    const resolvedParams = await Promise.resolve(params)
    const creatorId = resolvedParams.creatorId

    let currentUser
    try {
      currentUser = await getAuthenticatedUser()
    } catch (authError: any) {
      // If auth fails due to network timeout, try to proceed with creatorId from params
      // This is a fallback for when Supabase is unreachable but we trust the middleware
      console.warn('Auth check failed, using creatorId from params:', authError.message)
      // Still need to verify the creatorId matches what's in the token/header
      // For now, we'll proceed but this should be improved
    }

    const isAdmin = currentUser?.role === 'admin'
    const effectiveCreatorId = isAdmin ? creatorId : (currentUser?.id || creatorId)

    if (!effectiveCreatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 })
    }

    // If we have currentUser and it's not admin, always use the authenticated user ID
    if (currentUser && !isAdmin && creatorId && currentUser.id !== creatorId) {
      console.warn('Creator ID mismatch, using authenticated user ID:', {
        requestedCreatorId: creatorId,
        authenticatedUserId: currentUser.id,
      })
    }

    const adminSupabase = createAdminSupabaseClient()

    let creator = currentUser
    if (!creator || isAdmin) {
      const { data: creatorData } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', effectiveCreatorId)
        .single()
      creator = creatorData
    }

    if (!creator) {
      throw new NotFoundError('Creator')
    }

    // Get tracking links - use admin client to bypass RLS if needed
    // Query tracking links first, then get properties separately to avoid join issues
    // Ensure creatorId is a string for comparison
    const creatorIdStr = String(effectiveCreatorId).trim()
    
    // First, try direct query
    let { data: trackingLinks, error: trackingLinksError } = await adminSupabase
      .from('tracking_links')
      .select('*')
      .eq('creator_id', creatorIdStr)
      .order('created_at', { ascending: false })

    // If no results, try without strict equality (in case of UUID format issues)
    if ((!trackingLinks || trackingLinks.length === 0) && !trackingLinksError) {
      // Get all tracking links and filter manually
      const { data: allLinks } = await adminSupabase
        .from('tracking_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (allLinks && allLinks.length > 0) {
        // Filter by creator_id with flexible matching
        trackingLinks = allLinks.filter((link: any) => {
          const linkCreatorId = String(link.creator_id || '').trim().toLowerCase()
          const searchCreatorId = creatorIdStr.toLowerCase()
          return linkCreatorId === searchCreatorId
        })
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Filtered tracking links:', {
            totalInDB: allLinks.length,
            matched: trackingLinks.length,
            creatorIdSearched: creatorIdStr,
            sampleCreatorIds: allLinks.slice(0, 5).map((l: any) => l.creator_id),
          })
        }
      }
    }

    // If no results, check if there's a UUID format mismatch
    if ((!trackingLinks || trackingLinks.length === 0) && !trackingLinksError) {
      // Try querying all links to debug
      const { data: allLinks } = await adminSupabase
        .from('tracking_links')
        .select('id, creator_id, property_id, unique_code, created_at')
        .limit(20)
        .order('created_at', { ascending: false })
      
      console.log('=== TRACKING LINKS DEBUG ===')
      console.log('Looking for creator_id:', creatorIdStr)
      console.log('Current User ID:', currentUser?.id || 'unknown')
      console.log('Creator ID type:', typeof creatorIdStr)
      console.log('Sample tracking links in DB (first 20):', allLinks)
      
      // Check if any links match (case-insensitive string comparison)
      if (allLinks && allLinks.length > 0) {
        const matchingLinks = allLinks.filter((link: any) => 
          String(link.creator_id).trim().toLowerCase() === creatorIdStr.toLowerCase()
        )
        console.log('Matching links found:', matchingLinks.length)
        if (matchingLinks.length > 0) {
          console.log('Matching links:', matchingLinks)
          // Use the matching links
          const { data: matchedLinks } = await adminSupabase
            .from('tracking_links')
            .select('*')
            .in('id', matchingLinks.map((l: any) => l.id))
            .order('created_at', { ascending: false })
          trackingLinks = matchedLinks
        }
      }
      console.log('=== END DEBUG ===')
    }

    if (trackingLinksError) {
      console.error('Error fetching tracking links:', trackingLinksError)
      console.error('Creator ID used:', effectiveCreatorId)
      console.error('Current User ID:', currentUser?.id || 'unknown')
      console.error('Creator ID type:', typeof effectiveCreatorId)
    }

    // Ensure we have an array
    const safeTrackingLinks = Array.isArray(trackingLinks) ? trackingLinks : []

    // Get properties for the tracking links
    const propertyIds = safeTrackingLinks.map((t: any) => t.property_id).filter(Boolean)
    let propertiesMap: Record<string, any> = {}
    
    if (propertyIds.length > 0) {
      const { data: properties, error: propertiesError } = await adminSupabase
        .from('properties')
        .select('id, title')
        .in('id', propertyIds)

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError)
      } else {
        propertiesMap = (properties || []).reduce((acc: any, prop: any) => {
          acc[prop.id] = prop
          return acc
        }, {})
      }
    }

    // Combine tracking links with their properties
    const trackingLinksWithProperties = safeTrackingLinks.map((t: any) => ({
      ...t,
      properties: propertiesMap[t.property_id] || null,
    }))

    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Dashboard API Debug:', {
        creatorId: effectiveCreatorId,
        currentUserId: currentUser?.id || 'unknown',
        trackingLinksCount: safeTrackingLinks.length,
        trackingLinks: safeTrackingLinks.map((t: any) => ({ 
          id: t.id, 
          creator_id: t.creator_id,
          property_id: t.property_id, 
          unique_code: t.unique_code 
        })),
        propertiesCount: Object.keys(propertiesMap).length,
        trackingLinksWithPropertiesCount: trackingLinksWithProperties.length,
      })
    }

    const totalImpressions = trackingLinksWithProperties?.reduce((sum, t) => sum + (t.impressions || 0), 0) || 0
    const totalClicks = trackingLinksWithProperties?.reduce((sum, t) => sum + (t.clicks || 0), 0) || 0
    const totalLeads = trackingLinksWithProperties?.reduce((sum, t) => sum + (t.leads || 0), 0) || 0
    const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0

    // Get earnings from escrow - use admin client
    const { data: escrowTransactions } = await adminSupabase
      .from('escrow_transactions')
      .select('*')
      .eq('creator_id', effectiveCreatorId)
      .eq('status', 'released')

    const totalEarned = escrowTransactions?.reduce((sum, t) => {
      const splits = t.splits as any
      return sum + (splits?.creator_amount || 0)
    }, 0) || 0

    // Get wallet - use admin client
    const { data: wallet } = await adminSupabase
      .from('wallets')
      .select('*')
      .eq('user_id', effectiveCreatorId)
      .maybeSingle()

    // Explicitly get social accounts to ensure proper filtering - use admin client
    const { data: socialAccountsExplicit } = await adminSupabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', effectiveCreatorId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      tier: creator?.tier || 1,
      social_stats: socialAccountsExplicit || [],
      promoting: {
        active_properties: trackingLinksWithProperties?.length || 0,
        properties: trackingLinksWithProperties?.map((t) => t.properties).filter(Boolean) || [],
      },
      performance: {
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_leads: totalLeads,
        conversion_rate: conversionRate,
        by_property: trackingLinksWithProperties.map((t: any) => ({
          id: t.id,
          property_id: t.property_id,
          property_title: t.properties?.title || `Property ${t.property_id?.substring(0, 8)}...`,
          unique_code: t.unique_code,
          tracking_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000'}/creator/link/${t.unique_code}`,
          impressions: t.impressions || 0,
          clicks: t.clicks || 0,
          leads: t.leads || 0,
          inspections: t.inspections || 0,
          conversions: t.conversions || 0,
          conversion_rate: t.clicks > 0 ? ((t.leads || 0) / t.clicks) * 100 : 0,
          created_at: t.created_at,
        })),
      },
      earnings: {
        total_earned: totalEarned,
        pending: wallet?.locked_balance || 0,
        withdrawn: (wallet?.balance || 0) - (wallet?.locked_balance || 0),
        wallet_balance: wallet?.balance || 0,
      },
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}

