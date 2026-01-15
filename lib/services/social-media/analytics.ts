const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'instagram-statistics-api.p.rapidapi.com';

function getByPath(value: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);
}

function toNumber(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function pickFirstNumber(source: any, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = getByPath(source, path);
    const parsed = toNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function normalizeInstagramProfile(profile: any): InstagramAnalytics {
  const root = profile?.data ?? profile?.result ?? profile ?? {};
  const user = root?.user ?? root?.account ?? root?.profile ?? root;

  const followers = pickFirstNumber(root, [
    'followers',
    'followers_count',
    'follower_count',
    'user.followers',
    'user.followers_count',
    'user.follower_count',
    'edge_followed_by.count',
    'user.edge_followed_by.count',
  ]) ?? 0;

  if (!followers) {
    const keys = Object.keys(profile ?? {});
    throw new Error(`Invalid API response: missing follower data. Top-level keys: ${keys.join(', ') || 'none'}`);
  }

  const following = pickFirstNumber(root, [
    'following',
    'following_count',
    'user.following',
    'user.following_count',
    'edge_follow.count',
    'user.edge_follow.count',
  ]) ?? 0;

  const posts = pickFirstNumber(root, [
    'posts',
    'posts_count',
    'media_count',
    'user.media_count',
    'edge_owner_to_timeline_media.count',
    'user.edge_owner_to_timeline_media.count',
  ]) ?? 0;

  const avgLikes = pickFirstNumber(root, [
    'avg_likes',
    'average_likes',
    'avgLikes',
    'avg_likes_per_post',
  ]) ?? 0;

  const avgComments = pickFirstNumber(root, [
    'avg_comments',
    'average_comments',
    'avgComments',
    'avg_comments_per_post',
  ]) ?? 0;

  let engagementRate = pickFirstNumber(root, [
    'engagement_rate',
    'engagementRate',
    'engagement',
  ]);

  if (engagementRate === undefined && followers > 0) {
    const totalEngagement = avgLikes + avgComments;
    engagementRate = (totalEngagement / followers) * 100;
  }
  if (engagementRate === undefined) engagementRate = 0;

  const fakeFollowerPercent = pickFirstNumber(root, [
    'fake_followers_percent',
    'fakeFollowerPercent',
    'fake_followers',
  ]) ?? 0;

  const qualityScore = pickFirstNumber(root, [
    'quality_score',
    'qualityScore',
    'quality',
  ]) ?? 0;

  const audience = root?.audience ?? root?.audience_demographics ?? root?.audienceDemographics ?? {};
  const ageGroups = audience?.age_groups ?? audience?.ageGroups ?? {};
  const genderRatio = audience?.gender_ratio ?? audience?.genderRatio ?? { male: 0, female: 0 };
  const topCountries = audience?.top_countries ?? audience?.topCountries ?? [];

  return {
    username: user?.username || root?.username || '',
    followers,
    following,
    posts,
    engagementRate: parseFloat(engagementRate.toFixed(2)),
    avgLikes,
    avgComments,
    fakeFollowerPercent,
    qualityScore,
    audienceDemographics: {
      ageGroups,
      genderRatio,
      topCountries,
    },
  };
}

export interface SocialProfile {
  platform: 'instagram' | 'tiktok' | 'twitter';
  username: string;
  url: string;
}

export interface InstagramAnalytics {
  username: string;
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  fakeFollowerPercent: number;
  qualityScore: number;
  audienceDemographics: {
    ageGroups: Record<string, number>;
    genderRatio: { male: number; female: number };
    topCountries: string[];
  };
}

export interface TikTokAnalytics {
  username: string;
  followers: number;
  following: number;
  videos: number;
  hearts: number;
  engagementRate: number;
  avgViews: number;
  avgLikes: number;
  qualityScore: number;
}

export interface TwitterAnalytics {
  username: string;
  followers: number;
  following: number;
  tweets: number;
  engagementRate: number;
  avgRetweets: number;
  avgLikes: number;
  qualityScore: number;
}

interface AnalyticsResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SocialMediaAnalytics {
  // 1. Get Instagram Analytics
  static async getInstagramProfile(usernameOrUrl: string): Promise<AnalyticsResult<InstagramAnalytics>> {
    try {
      if (!RAPIDAPI_KEY) {
        throw new Error('RAPIDAPI_KEY is not set. Configure it in .env.local before verifying social profiles.')
      }

      // Extract username from URL if needed
      const isUrl = usernameOrUrl.startsWith('http')
      const username = isUrl
        ? usernameOrUrl.split('/').filter(Boolean).pop()?.replace('@', '') || usernameOrUrl
        : usernameOrUrl.replace('@', '')

      // Use /community endpoint with cid parameter
      // Based on API pattern from Twitter (TW:username), try similar formats for Instagram
      // Order: simplest to most complex
      const cidFormats = [
        username,                                    // Try just username first (e.g., "prayze26")
        `IG:${username}`,                           // Try IG prefix (similar to TW:username pattern)
        `instagram.com/${username}`,                // Try domain/username format
        `https://instagram.com/${username}`,        // Try URL format without www
        `https://www.instagram.com/${username}`,    // Try full URL
        `https://www.instagram.com/${username}/`,   // Try with trailing slash
        `INST:${username}`,                         // Try INST prefix as fallback
      ]

      let lastError: Error | undefined
      let attemptCount = 0

      for (const cidValue of cidFormats) {
        attemptCount++
        try {
          console.log(`[Instagram API] Attempt ${attemptCount}/${cidFormats.length}: Trying CID format '${cidValue}'`)

          const url = new URL(`https://${RAPIDAPI_HOST}/community`)
          url.searchParams.append('cid', cidValue)

          const response = await fetch(url.toString(), {
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': RAPIDAPI_HOST,
            } as HeadersInit,
          })

          if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            console.log(`[Instagram API] Response ${response.status} for '${cidValue}': ${errorText}`)

            if (response.status === 404) {
              // 404 might mean profile not found, try next format
              lastError = new Error(`Instagram profile not found for username '${username}'. The account may not exist or may be private.`)
              continue
            }

            // Other errors (401, 403, 500, etc.) - don't retry, throw immediately
            throw new Error(`API returned error ${response.status}: ${errorText || 'No details available'}`)
          }

          const responseData = await response.json()
          console.log(`[Instagram API] Success with CID '${cidValue}':`, JSON.stringify(responseData, null, 2))

          // Validate response structure
          if (!responseData || (!responseData.data && !responseData.usersCount)) {
            console.warn(`[Instagram API] Invalid response structure for '${cidValue}', trying next format`)
            continue
          }

          // Check if response is for Instagram (not Twitter/TikTok)
          const profile = responseData.data || responseData
          const socialType = profile.socialType || profile.cid?.split(':')[0] || ''

          if (socialType && !['INST', 'IG'].includes(socialType)) {
            console.warn(`[Instagram API] Got ${socialType} instead of Instagram for '${cidValue}', trying next format`)
            lastError = new Error(`The account '${username}' was found on ${socialType}, not Instagram. Please provide an Instagram username.`)
            continue
          }

          // Success! Parse and return the response
          console.log(`[Instagram API] ✅ Successfully found Instagram profile for '${username}'`)
          return this.parseInstagramResponse(responseData, username)

        } catch (error: any) {
          console.error(`[Instagram API] Error with CID '${cidValue}':`, error.message)

          // If it's a 404 from inside this try block, continue to next format
          if (error.message?.includes('404') || error.message?.includes('not found')) {
            lastError = error
            continue
          }

          // For other errors (network, API key issues, etc.), throw immediately
          throw error
        }
      }

      // If we've tried all formats and none worked, throw descriptive error
      console.error(`[Instagram API] ❌ All ${attemptCount} CID formats failed for username '${username}'`)

      if (lastError) {
        throw lastError
      }

      throw new Error(`Unable to find Instagram profile for '${username}'. Please verify the username is correct and the account exists. If the account is private, it may not be accessible via the API.`)

    } catch (error: any) {
      console.error('Instagram Analytics Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch Instagram data',
      };
    }
  }

  // Helper method to parse Instagram API response
  private static parseInstagramResponse(responseData: any, username: string): AnalyticsResult<InstagramAnalytics> {
    // Handle response wrapper: { meta: { code: 200 }, data: { ... } }
    if (responseData.meta && responseData.meta.code !== 200) {
      throw new Error(`API returned error: ${responseData.meta.message || 'Unknown error'}`)
    }

    const profile = responseData.data || responseData

    // Validate response structure - usersCount must exist and be a number (0 is valid)
    if (!profile || typeof profile.usersCount !== 'number') {
      throw new Error(`Invalid API response: missing or invalid usersCount field. Received: ${JSON.stringify(Object.keys(profile || {}))}`)
    }

    // Map API response fields to our interface
    const followers = typeof profile.usersCount === 'number' ? profile.usersCount : 0
    const screenName = profile.screenName || profile.name || username
    const fakeFollowerPercent = typeof profile.pctFakeFollowers === 'number' ? profile.pctFakeFollowers : 0

    // Check socialType to ensure we got Instagram data (INST) not Twitter (TW) or TikTok (TT)
    const socialType = profile.socialType || profile.cid?.split(':')[0] || ''
    if (socialType && !['INST', 'IG'].includes(socialType)) {
      console.warn(`Expected Instagram (INST) but got ${socialType}. Continuing anyway...`)
    }

    // Calculate engagement rate - API may provide avgER or we need to calculate
    let engagementRate = 0
    if (typeof profile.avgER === 'number') {
      engagementRate = profile.avgER
    } else if (profile.avgInteractions && typeof profile.avgInteractions === 'number' && followers > 0) {
      engagementRate = (profile.avgInteractions / followers) * 100
    } else if (profile.avgViews && typeof profile.avgViews === 'number' && followers > 0) {
      // Instagram engagement can be calculated from views if likes/comments not available
      engagementRate = (profile.avgViews / followers) * 100
    }

    // Extract audience demographics
    const membersGendersAges = profile.membersGendersAges || {}
    const genderSummary = membersGendersAges.summary || {}
    const audience = {
      ageGroups: profile.ages || profile.ageGroups || {},
      genderRatio: {
        male: typeof genderSummary.m === 'number' ? genderSummary.m : 0,
        female: typeof genderSummary.f === 'number' ? genderSummary.f : 0,
      },
      topCountries: Array.isArray(profile.countries) ? profile.countries :
        Array.isArray(profile.membersCountries) ? profile.membersCountries : [],
    }

    // Calculate quality score if not provided (simplified formula)
    let qualityScore = typeof profile.qualityScore === 'number' ? profile.qualityScore : 0
    if (qualityScore === 0 && followers > 0) {
      // Simple quality score based on followers and fake follower percentage
      // Higher followers = higher score, lower fake % = higher score
      qualityScore = Math.min(100, Math.max(0,
        Math.min(50, Math.log10(Math.max(1, followers)) * 10) + // Log scale for followers (caps at 50)
        (100 - fakeFollowerPercent * 2) // Fake follower penalty (up to -50 points)
      ))
    }

    const normalized: InstagramAnalytics = {
      username: screenName,
      followers: followers,
      following: typeof profile.following === 'number' ? profile.following : 0,
      posts: typeof profile.posts === 'number' ? profile.posts :
        typeof profile.mediaCount === 'number' ? profile.mediaCount : 0,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      avgLikes: typeof profile.avgLikes === 'number' ? profile.avgLikes :
        typeof profile.avgInteractions === 'number' ? profile.avgInteractions : 0,
      avgComments: typeof profile.avgComments === 'number' ? profile.avgComments : 0,
      fakeFollowerPercent: fakeFollowerPercent,
      qualityScore: Math.round(qualityScore),
      audienceDemographics: audience,
    }

    if (normalized.followers > 0 && normalized.followers < 1000 && normalized.engagementRate > 10) {
      console.warn('Suspicious data: very high engagement rate for low follower count', {
        followers: normalized.followers,
        engagementRate: normalized.engagementRate
      })
    }

    return {
      success: true,
      data: normalized,
    }
  }

  // 2. Get TikTok Analytics
  static async getTikTokProfile(username: string): Promise<AnalyticsResult<TikTokAnalytics>> {
    try {
      if (!RAPIDAPI_KEY) {
        throw new Error('RAPIDAPI_KEY is not set. Configure it in .env.local before verifying social profiles.')
      }

      const url = new URL(`https://${RAPIDAPI_HOST}/tiktok/info`)
      url.searchParams.append('username', username)

      const response = await fetch(url.toString(), {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        } as HeadersInit,
      })

      if (!response.ok) {
        // Provide more helpful error message for 404
        if (response.status === 404) {
          const errorText = await response.text().catch(() => '')
          throw new Error(`TikTok API endpoint not found (404). The endpoint '/tiktok/info' may not exist on ${RAPIDAPI_HOST}. Please check: 1) Your RapidAPI subscription includes this API, 2) The endpoint path is correct, 3) Your RAPIDAPI_KEY and RAPIDAPI_HOST are set correctly. Error: ${errorText || 'No additional details'}`)
        }
        const errorText = await response.text().catch(() => '')
        throw new Error(`HTTP error! status: ${response.status}. ${errorText || ''}`)
      }

      const profile = await response.json()

      // Log the raw response for debugging
      console.log('TikTok API Response:', JSON.stringify(profile, null, 2))

      // Validate that we got real data
      if (!profile || typeof profile.followers !== 'number') {
        throw new Error('Invalid API response: missing or invalid follower data')
      }

      // TikTok engagement = (likes + comments) / (followers * posts) * 100
      let engagementRate = profile.engagement_rate
      if (!engagementRate && profile.followers > 0) {
        engagementRate = ((profile.hearts || 0) / profile.followers) * 100
      } else if (!engagementRate) {
        engagementRate = 0
      }

      return {
        success: true,
        data: {
          username: profile.username || '',
          followers: profile.followers || 0,
          following: profile.following || 0,
          videos: profile.videos || 0,
          hearts: profile.hearts || 0,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          avgViews: profile.avg_views || 0,
          avgLikes: profile.avg_likes || 0,
          qualityScore: profile.quality_score || 0,
        },
      };
    } catch (error: any) {
      console.error('TikTok Analytics Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch TikTok data',
      };
    }
  }

  // 3. Get Twitter Analytics - Uses same /community endpoint as Instagram
  static async getTwitterProfile(usernameOrUrl: string): Promise<AnalyticsResult<TwitterAnalytics>> {
    try {
      if (!RAPIDAPI_KEY) {
        throw new Error('RAPIDAPI_KEY is not set. Configure it in .env.local before verifying social profiles.')
      }

      // Use /community endpoint - use original URL if provided, otherwise construct it
      const isUrl = usernameOrUrl.startsWith('http')
      const twitterUrl = isUrl ? usernameOrUrl : `https://twitter.com/${usernameOrUrl}`
      const url = new URL(`https://${RAPIDAPI_HOST}/community`)
      url.searchParams.append('cid', twitterUrl)

      const username = isUrl ? usernameOrUrl.split('/').filter(Boolean).pop() || '' : usernameOrUrl

      const response = await fetch(url.toString(), {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        } as HeadersInit,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          // Not JSON, use as string
        }

        if (response.status === 404) {
          // Try alternative: use TW:username format
          const altUrl = new URL(`https://${RAPIDAPI_HOST}/community`)
          altUrl.searchParams.append('cid', `TW:${username}`)

          const altResponse = await fetch(altUrl.toString(), {
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': RAPIDAPI_HOST,
            } as HeadersInit,
          })

          if (!altResponse.ok) {
            // Twitter API may not be available in this RapidAPI subscription
            // Return a clear error that Twitter verification is not available
            return {
              success: false,
              error: `Twitter verification is not available. The Twitter API endpoint is not included in your RapidAPI subscription, or the endpoint path is incorrect. Please verify your RapidAPI configuration or use Instagram/TikTok instead.`,
            }
          }

          const altData = await altResponse.json()
          return this.parseTwitterResponse(altData, username || usernameOrUrl)
        }
        throw new Error(`HTTP error! status: ${response.status}. ${errorText || ''}`)
      }

      const responseData = await response.json()
      console.log('Twitter API Response:', JSON.stringify(responseData, null, 2))

      return this.parseTwitterResponse(responseData, username || usernameOrUrl)
    } catch (error: any) {
      console.error('Twitter Analytics Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch Twitter data',
      };
    }
  }

  // Helper method to parse Twitter API response
  private static parseTwitterResponse(responseData: any, username: string): AnalyticsResult<TwitterAnalytics> {
    // Handle response wrapper: { meta: { code: 200 }, data: { ... } }
    if (responseData.meta && responseData.meta.code !== 200) {
      throw new Error(`API returned error: ${responseData.meta.message || 'Unknown error'}`)
    }

    const profile = responseData.data || responseData

    // Validate response structure - usersCount must exist and be a number (0 is valid)
    if (!profile || typeof profile.usersCount !== 'number') {
      throw new Error(`Invalid API response: missing or invalid usersCount field. Received: ${JSON.stringify(Object.keys(profile || {}))}`)
    }

    const followers = typeof profile.usersCount === 'number' ? profile.usersCount : 0
    const screenName = profile.screenName || profile.name || username
    const fakeFollowerPercent = typeof profile.pctFakeFollowers === 'number' ? profile.pctFakeFollowers : 0

    // Calculate engagement rate
    let engagementRate = 0
    if (typeof profile.avgER === 'number') {
      engagementRate = profile.avgER
    } else if (profile.avgInteractions && typeof profile.avgInteractions === 'number' && followers > 0) {
      engagementRate = (profile.avgInteractions / followers) * 100
    }

    // Calculate quality score
    let qualityScore = typeof profile.qualityScore === 'number' ? profile.qualityScore : 0
    if (qualityScore === 0 && followers > 0) {
      qualityScore = Math.min(100, Math.max(0,
        Math.min(50, Math.log10(Math.max(1, followers)) * 10) +
        (100 - fakeFollowerPercent * 2)
      ))
    }

    return {
      success: true,
      data: {
        username: screenName,
        followers: followers,
        following: typeof profile.following === 'number' ? profile.following : 0,
        tweets: typeof profile.tweets === 'number' ? profile.tweets : 0,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        avgRetweets: typeof profile.avgRetweets === 'number' ? profile.avgRetweets : 0,
        avgLikes: typeof profile.avgLikes === 'number' ? profile.avgLikes :
          typeof profile.avgInteractions === 'number' ? profile.avgInteractions : 0,
        qualityScore: Math.round(qualityScore),
      },
    }
  }

  // 4. Calculate Creator Tier
  static calculateTier(analytics: InstagramAnalytics | TikTokAnalytics | TwitterAnalytics): number {
    const { followers, engagementRate, qualityScore } = analytics;
    const fakeFollowerPercent = 'fakeFollowerPercent' in analytics
      ? (analytics as InstagramAnalytics).fakeFollowerPercent
      : 0;

    // Log the calculation inputs for debugging
    console.log('Calculating tier with:', {
      followers,
      engagementRate,
      qualityScore,
      fakeFollowerPercent
    })

    // Validate inputs - reject invalid data
    if (!followers || followers <= 0 || isNaN(followers)) {
      console.warn('Invalid followers count:', followers)
      return 0
    }

    if (isNaN(engagementRate) || engagementRate < 0) {
      console.warn('Invalid engagement rate:', engagementRate)
      return 0
    }

    if (isNaN(qualityScore) || qualityScore < 0) {
      console.warn('Invalid quality score:', qualityScore)
      return 0
    }

    // Tier 1: Elite Creators (100K+ followers, 3%+ engagement, <10% fake)
    if (
      followers >= 100000 &&
      engagementRate >= 3.0 &&
      qualityScore >= 85 &&
      fakeFollowerPercent < 10
    ) {
      console.log('Calculated Tier 1')
      return 1;
    }

    // Tier 2: Professional Creators (50K-100K followers, 2-3% engagement)
    if (
      followers >= 50000 &&
      followers < 100000 &&
      engagementRate >= 2.0 &&
      qualityScore >= 70 &&
      fakeFollowerPercent < 15
    ) {
      return 2;
    }

    // Tier 3: Rising Creators (10K-50K followers, 1.5-2% engagement)
    if (
      followers >= 10000 &&
      followers < 50000 &&
      engagementRate >= 1.5 &&
      qualityScore >= 60 &&
      fakeFollowerPercent < 20
    ) {
      return 3;
    }

    // Tier 4: Micro Creators (5K-10K followers, 1%+ engagement)
    if (
      followers >= 5000 &&
      followers < 10000 &&
      engagementRate >= 1.0 &&
      qualityScore >= 50 &&
      fakeFollowerPercent < 25
    ) {
      return 4;
    }

    // Below minimum threshold
    console.log('No tier matched - returning 0 (not qualified)')
    return 0; // Not qualified
  }

  // 5. Verify All Social Profiles
  static async verifyCreatorProfiles(profiles: SocialProfile[]): Promise<{
    success: boolean;
    tier: number;
    analytics: Record<string, any>;
    errors: string[];
  }> {
    const analytics: Record<string, any> = {};
    const errors: string[] = [];
    let highestTier = 0;

    for (const profile of profiles) {
      try {
        if (profile.platform === 'instagram') {
          // Use original URL if available, otherwise use username
          const identifier = profile.url || profile.username
          const result = await this.getInstagramProfile(identifier);
          if (result.success && result.data) {
            analytics.instagram = result.data;
            const tier = this.calculateTier(result.data);
            highestTier = Math.max(highestTier, tier);
          } else {
            errors.push(`Instagram: ${result.error}`);
          }
        } else if (profile.platform === 'tiktok') {
          const identifier = profile.url || profile.username
          const result = await this.getTikTokProfile(identifier);
          if (result.success && result.data) {
            analytics.tiktok = result.data;
            const tier = this.calculateTier(result.data);
            highestTier = Math.max(highestTier, tier);
          } else {
            errors.push(`TikTok: ${result.error}`);
          }
        } else if (profile.platform === 'twitter') {
          const identifier = profile.url || profile.username
          const result = await this.getTwitterProfile(identifier);
          if (result.success && result.data) {
            analytics.twitter = result.data;
            // Twitter uses different tier calculation (simplified)
            if (result.data.followers >= 50000) highestTier = Math.max(highestTier, 2);
            else if (result.data.followers >= 20000) highestTier = Math.max(highestTier, 3);
            else if (result.data.followers >= 5000) highestTier = Math.max(highestTier, 4);
          } else {
            errors.push(`Twitter: ${result.error}`);
          }
        }
      } catch (error: any) {
        errors.push(`${profile.platform}: ${error.message}`);
      }
    }

    return {
      success: Object.keys(analytics).length > 0,
      tier: highestTier,
      analytics,
      errors,
    };
  }

  // 6. Extract Username from URL
  static extractUsername(url: string, platform: 'instagram' | 'tiktok' | 'twitter'): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      if (platform === 'instagram') {
        // https://instagram.com/username or https://www.instagram.com/username/
        return pathname.split('/').filter(Boolean)[0];
      } else if (platform === 'tiktok') {
        // https://tiktok.com/@username or https://www.tiktok.com/@username
        const username = pathname.split('/').filter(Boolean)[0];
        return username.replace('@', '');
      } else if (platform === 'twitter') {
        // https://twitter.com/username or https://x.com/username
        return pathname.split('/').filter(Boolean)[0];
      }

      return '';
    } catch (error) {
      return '';
    }
  }
}

// Helper: Parse social media URLs
export function parseSocialLinks(socialLinks: {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
}): SocialProfile[] {
  const profiles: SocialProfile[] = [];

  if (socialLinks.instagram) {
    const username = SocialMediaAnalytics.extractUsername(
      socialLinks.instagram,
      'instagram'
    );
    if (username) {
      profiles.push({
        platform: 'instagram',
        username,
        url: socialLinks.instagram,
      });
    }
  }

  if (socialLinks.tiktok) {
    const username = SocialMediaAnalytics.extractUsername(
      socialLinks.tiktok,
      'tiktok'
    );
    if (username) {
      profiles.push({
        platform: 'tiktok',
        username,
        url: socialLinks.tiktok,
      });
    }
  }

  if (socialLinks.twitter) {
    const username = SocialMediaAnalytics.extractUsername(
      socialLinks.twitter,
      'twitter'
    );
    if (username) {
      profiles.push({
        platform: 'twitter',
        username,
        url: socialLinks.twitter,
      });
    }
  }

  return profiles;
}
