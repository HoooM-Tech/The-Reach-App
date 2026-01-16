import axios from 'axios';

// Clean and validate API key (remove quotes, trim whitespace)
const rawApiKey = process.env.SOCIAVAULT_API_KEY || '';
const SOCIAVAULT_API_KEY = rawApiKey.trim().replace(/^["'](.*)["']$/, '$1');

if (!SOCIAVAULT_API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('SOCIAVAULT_API_KEY must be set in production environment');
}

if (!SOCIAVAULT_API_KEY) {
  console.warn('⚠️  WARNING: SOCIAVAULT_API_KEY is not set. Configure it in .env.local before verifying social profiles!');
}

// Allow override of base URL via env var, but default to the documented endpoint
const SOCIAVAULT_BASE_URL = (process.env.SOCIAVAULT_BASE_URL || 'https://api.sociavault.com/v1/scrape').replace(/\/+$/, '');

interface InstagramProfile {
  username: string;
  full_name: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  biography: string;
  is_verified: boolean;
  is_private: boolean;
  profile_pic_url: string;
  external_url?: string;
}

interface InstagramPost {
  shortcode: string;
  like_count: number;
  comment_count: number;
  caption: string;
  timestamp: string;
  media_type: 'photo' | 'video' | 'carousel';
}

interface TikTokProfile {
  uniqueId: string;
  nickname: string;
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  verified: boolean;
  signature: string;
}

interface TikTokVideo {
  id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  desc: string;
  createTime: number;
}

interface TwitterProfile {
  username: string;
  name: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  verified: boolean;
  description: string;
}

interface AnalyticsResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Normalized analytics interfaces to match existing database schema
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

export class SociaVaultService {
  private static getHeaders(useApiKeyHeader = false) {
    if (!SOCIAVAULT_API_KEY) {
      throw new Error('SOCIAVAULT_API_KEY is not set. Configure it in .env.local before verifying social profiles.');
    }
    
    // Some APIs use X-API-Key header instead of Authorization Bearer
    if (useApiKeyHeader) {
      return {
        'X-API-Key': SOCIAVAULT_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
    }
    
    // Default: Try Bearer token format
    return {
      'Authorization': `Bearer ${SOCIAVAULT_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
  
  // Try request with fallback authentication methods
  private static async makeRequest<T>(
    url: string,
    params?: Record<string, any>,
    retryCount = 0
  ): Promise<T> {
    const maxRetries = 3;
    
    // Method 1: Bearer token in Authorization header
    if (retryCount === 0) {
      try {
        const response = await axios.get(url, {
          headers: this.getHeaders(false),
          params,
        });
        console.log(`API Response (Method ${retryCount + 1}):`, {
          url,
          status: response.status,
          dataKeys: Object.keys(response.data || {}),
          dataSample: JSON.stringify(response.data).substring(0, 200),
        });
        return response.data;
      } catch (error: any) {
        console.log(`API Error (Method ${retryCount + 1}):`, {
          url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        if (error.response?.status === 401 && retryCount < maxRetries) {
          return this.makeRequest<T>(url, params, retryCount + 1);
        }
        throw error;
      }
    }
    
    // Method 2: X-API-Key header
    if (retryCount === 1) {
      try {
        console.log('Trying X-API-Key header authentication...');
        const response = await axios.get(url, {
          headers: this.getHeaders(true),
          params,
        });
        console.log(`API Response (Method ${retryCount + 1}):`, {
          url,
          status: response.status,
          dataKeys: Object.keys(response.data || {}),
          dataSample: JSON.stringify(response.data).substring(0, 200),
        });
        return response.data;
      } catch (error: any) {
        console.log(`API Error (Method ${retryCount + 1}):`, {
          url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        if (error.response?.status === 401 && retryCount < maxRetries) {
          return this.makeRequest<T>(url, params, retryCount + 1);
        }
        throw error;
      }
    }
    
    // Method 3: API key as query parameter
    if (retryCount === 2) {
      try {
        console.log('Trying API key as query parameter...');
        const response = await axios.get(url, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          params: {
            ...params,
            api_key: SOCIAVAULT_API_KEY,
          },
        });
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 401 && retryCount < maxRetries) {
          return this.makeRequest<T>(url, params, retryCount + 1);
        }
        throw error;
      }
    }
    
    // Method 4: Try without /scrape in URL (maybe base URL is different)
    if (retryCount === 3) {
      try {
        console.log('Trying alternative base URL without /scrape...');
        const altUrl = url.replace('/v1/scrape', '/v1');
        const response = await axios.get(altUrl, {
          headers: this.getHeaders(false),
          params,
        });
        return response.data;
      } catch (error: any) {
        throw error;
      }
    }
    
    throw new Error('All authentication methods failed');
  }
  
  private static getDiagnostics() {
    return {
      apiKeySet: !!SOCIAVAULT_API_KEY,
      apiKeyLength: SOCIAVAULT_API_KEY?.length || 0,
      apiKeyTail: SOCIAVAULT_API_KEY ? `****${SOCIAVAULT_API_KEY.slice(-6)}` : 'NOT SET',
      baseUrl: SOCIAVAULT_BASE_URL,
    };
  }

  // 1. Get Instagram Profile + Recent Posts
  static async getInstagramProfile(username: string): Promise<AnalyticsResult<{
    profile: InstagramProfile;
    recentPosts: InstagramPost[];
    engagementRate: number;
    avgLikes: number;
    avgComments: number;
  }>> {
    try {
      if (!SOCIAVAULT_API_KEY) {
        throw new Error('SOCIAVAULT_API_KEY is not set. Configure it in .env.local before verifying social profiles.');
      }

      // Fetch profile data with fallback authentication
      // SociaVault API expects 'handle' parameter, not 'username'
      const profileData = await this.makeRequest<any>(
        `${SOCIAVAULT_BASE_URL}/instagram/profile`,
        { handle: username }
      );

      // Handle different response formats
      if (profileData.error) {
        throw new Error(profileData.error || 'Profile not found or is private');
      }

      // Check success status (can be at top level or nested)
      if (profileData.success === false || (profileData.status && profileData.status !== 'ok' && profileData.status !== 'success')) {
        throw new Error(profileData.message || profileData.error || 'Profile not found or is private');
      }

      // Instagram response structure can be triple-nested: data.data.data.user
      // Try multiple levels of nesting to find the user object
      let userData = profileData.data?.data?.data?.user || 
                     profileData.data?.data?.user || 
                     profileData.data?.user || 
                     profileData.user;
      
      // Validate userData exists and has identifying fields
      if (!userData) {
        // Log the structure for debugging
        console.error('Instagram response structure debug - no userData found:', {
          topLevelKeys: Object.keys(profileData || {}),
          hasData: !!profileData.data,
          dataKeys: profileData.data ? Object.keys(profileData.data) : [],
          hasDataData: !!profileData.data?.data,
          dataDataKeys: profileData.data?.data ? Object.keys(profileData.data.data) : [],
          hasDataDataData: !!profileData.data?.data?.data,
          dataDataDataKeys: profileData.data?.data?.data ? Object.keys(profileData.data.data.data) : [],
        });
        throw new Error('Invalid profile data received from API - user object not found in expected locations');
      }

      // Check if userData has at least one identifying field
      if (!userData.username && !userData.id && !userData.edge_followed_by) {
        console.error('Instagram userData found but missing required fields:', {
          userDataKeys: Object.keys(userData),
          sample: JSON.stringify(userData).substring(0, 500),
        });
        throw new Error('Invalid profile data received from API - user object missing required fields');
      }

      // Extract profile data from nested structure
      const profile = {
        username: userData.username,
        full_name: userData.full_name || '',
        follower_count: userData.edge_followed_by?.count || 0,
        following_count: userData.edge_follow?.count || 0,
        media_count: userData.edge_owner_to_timeline_media?.count || 0,
        biography: userData.biography || '',
        is_verified: userData.is_verified || false,
        is_private: userData.is_private || false,
        profile_pic_url: userData.profile_pic_url_hd || userData.profile_pic_url || '',
        external_url: userData.external_url,
      };

      // Extract posts from edge_owner_to_timeline_media.edges
      // Edges might be an array or an object with numeric keys
      let edgesRaw = userData.edge_owner_to_timeline_media?.edges;
      let edges: any[] = [];
      
      if (Array.isArray(edgesRaw)) {
        edges = edgesRaw;
      } else if (edgesRaw && typeof edgesRaw === 'object') {
        // Convert object with numeric keys to array
        edges = Object.values(edgesRaw);
      }
      
      const posts: InstagramPost[] = edges
        .map((edge: any) => {
          // Handle both direct node structure and nested node structure
          const node = edge.node || edge;
          if (!node || !node.shortcode) {
            return null; // Skip invalid posts
          }
          
          const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || 
                         node.edge_media_to_caption?.edges?.['0']?.node?.text || '';
          const isVideo = node.is_video || false;
          const mediaType = node.__typename === 'GraphSidecar' ? 'carousel' : (isVideo ? 'video' : 'photo');
          
          return {
            shortcode: node.shortcode,
            like_count: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
            comment_count: node.edge_media_to_comment?.count || 0,
            caption: caption,
            timestamp: node.taken_at_timestamp?.toString() || '',
            media_type: mediaType,
          };
        })
        .filter((post): post is InstagramPost => post !== null); // Remove null entries with type guard

      // Calculate engagement metrics
      const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.like_count || 0), 0);
      const totalComments = posts.reduce((sum: number, post: any) => sum + (post.comment_count || 0), 0);
      const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
      const avgComments = posts.length > 0 ? totalComments / posts.length : 0;

      // Engagement rate = (avg likes + avg comments) / followers * 100
      const engagementRate = profile.follower_count > 0
        ? ((avgLikes + avgComments) / profile.follower_count) * 100
        : 0;

      return {
        success: true,
        data: {
          profile,
          recentPosts: posts,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          avgLikes: Math.round(avgLikes),
          avgComments: Math.round(avgComments),
        },
      };
    } catch (error: any) {
      const diagnostics = this.getDiagnostics();
      console.error('SociaVault Instagram Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        ...diagnostics,
      });
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        return {
          success: false,
          error: `Authentication failed (401). Please verify your SOCIAVAULT_API_KEY in .env.local. 
                  Token tail: ${diagnostics.apiKeyTail}
                  Base URL: ${diagnostics.baseUrl}
                  The API key may be invalid, expired, or incorrectly formatted.`,
        };
      }
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: `API endpoint not found (404). Please verify the SociaVault API endpoint is correct.
                  Attempted URL: ${diagnostics.baseUrl}/instagram/profile`,
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch Instagram profile',
      };
    }
  }

  // 2. Get TikTok Profile + Recent Videos
  static async getTikTokProfile(username: string): Promise<AnalyticsResult<{
    profile: TikTokProfile;
    recentVideos: TikTokVideo[];
    engagementRate: number;
    avgViews: number;
    avgLikes: number;
  }>> {
    try {
      if (!SOCIAVAULT_API_KEY) {
        throw new Error('SOCIAVAULT_API_KEY is not set. Configure it in .env.local before verifying social profiles.');
      }

      // Clean username (remove @ if present)
      const cleanUsername = username.replace('@', '');

      // Fetch profile with fallback authentication
      // SociaVault API expects 'handle' parameter
      const profileData = await this.makeRequest<any>(
        `${SOCIAVAULT_BASE_URL}/tiktok/profile`,
        { handle: cleanUsername }
      );

      // TikTok response logging removed for cleaner output

      // Handle different response formats
      if (profileData.error) {
        throw new Error(profileData.error || 'TikTok profile not found');
      }

      // Check if response has status field
      if (profileData.status && profileData.status !== 'success') {
        throw new Error(profileData.message || profileData.error || 'TikTok profile not found');
      }

      // The data might be directly in the response or in a data field
      const profile = profileData.data || profileData;
      
      // Validate profile has required fields
      if (!profile || (!profile.uniqueId && !profile.followerCount)) {
        throw new Error('Invalid profile data received from API');
      }

      // Fetch recent videos
      const videosData = await this.makeRequest<any>(
        `${SOCIAVAULT_BASE_URL}/tiktok/user-videos`,
        { handle: cleanUsername, limit: 30 }
      );

      // Handle different response formats for videos
      const videos = videosData?.data || videosData?.videos || videosData || [];

      // Calculate engagement metrics
      const totalViews = videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0);
      const totalLikes = videos.reduce((sum: number, v: any) => sum + (v.likes || 0), 0);
      const totalComments = videos.reduce((sum: number, v: any) => sum + (v.comments || 0), 0);
      const totalShares = videos.reduce((sum: number, v: any) => sum + (v.shares || 0), 0);

      const avgViews = videos.length > 0 ? totalViews / videos.length : 0;
      const avgLikes = videos.length > 0 ? totalLikes / videos.length : 0;

      // TikTok engagement rate = (likes + comments + shares) / views * 100
      const totalEngagement = totalLikes + totalComments + totalShares;
      const engagementRate = totalViews > 0
        ? (totalEngagement / totalViews) * 100
        : 0;

      return {
        success: true,
        data: {
          profile: {
            uniqueId: profile.uniqueId || cleanUsername,
            nickname: profile.nickname || '',
            followerCount: profile.followerCount || 0,
            followingCount: profile.followingCount || 0,
            heartCount: profile.heartCount || 0,
            videoCount: profile.videoCount || 0,
            verified: profile.verified || false,
            signature: profile.signature || '',
          },
          recentVideos: videos.map((video: any) => ({
            id: video.id,
            views: video.views || 0,
            likes: video.likes || 0,
            comments: video.comments || 0,
            shares: video.shares || 0,
            desc: video.desc || '',
            createTime: video.createTime,
          })),
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          avgViews: Math.round(avgViews),
          avgLikes: Math.round(avgLikes),
        },
      };
    } catch (error: any) {
      console.error('SociaVault TikTok Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check your SOCIAVAULT_API_KEY in .env.local.',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch TikTok profile',
      };
    }
  }

  // 3. Get Twitter/X Profile
  static async getTwitterProfile(username: string): Promise<AnalyticsResult<{
    profile: TwitterProfile;
    engagementRate: number;
  }>> {
    try {
      if (!SOCIAVAULT_API_KEY) {
        throw new Error('SOCIAVAULT_API_KEY is not set. Configure it in .env.local before verifying social profiles.');
      }

      const cleanUsername = username.replace('@', '');

      // SociaVault API expects 'handle' parameter
      const responseData = await this.makeRequest<any>(
        `${SOCIAVAULT_BASE_URL}/twitter/profile`,
        { handle: cleanUsername }
      );

      // Handle different response formats
      if (responseData.error) {
        throw new Error(responseData.error || 'Twitter profile not found');
      }

      // Check if response has success field
      if (responseData.success === false) {
        throw new Error(responseData.message || responseData.error || 'Twitter profile not found');
      }

      // Twitter response structure: data.data contains the actual profile data
      // The profile data is in data.data.legacy for most fields
      const profileData = responseData.data?.data || responseData.data || responseData;
      const legacy = profileData.legacy || profileData;
      
      if (!legacy || (!legacy.screen_name && !legacy.followers_count)) {
        throw new Error('Invalid profile data received from API');
      }

      // Extract profile data from nested structure
      const profile = {
        username: legacy.screen_name || profileData.core?.screen_name || cleanUsername,
        name: legacy.name || profileData.core?.name || '',
        followers_count: legacy.followers_count || 0,
        following_count: legacy.friends_count || 0,
        tweet_count: legacy.statuses_count || 0,
        verified: profileData.verification?.verified || profileData.is_blue_verified || false,
        description: legacy.description || '',
      };

      // Twitter typical engagement rate based on follower count
      let engagementRate = 1.0; // Default
      if (profile.followers_count < 10000) engagementRate = 2.0;
      else if (profile.followers_count < 100000) engagementRate = 1.5;
      else if (profile.followers_count < 1000000) engagementRate = 1.0;
      else engagementRate = 0.5;

      return {
        success: true,
        data: {
          profile,
          engagementRate,
        },
      };
    } catch (error: any) {
      console.error('SociaVault Twitter Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check your SOCIAVAULT_API_KEY in .env.local.',
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch Twitter profile',
      };
    }
  }

  // 4. Calculate Creator Tier (matching existing tier logic)
  static calculateTier(
    platform: 'instagram' | 'tiktok' | 'twitter',
    followers: number,
    engagementRate: number,
    isVerified: boolean,
    qualityScore?: number
  ): number {
    // Validate inputs
    if (!followers || followers <= 0 || isNaN(followers)) {
      return 0;
    }

    if (isNaN(engagementRate) || engagementRate < 0) {
      return 0;
    }
                                                                                                                                                                                                                          
    // Use quality score if provided, otherwise estimate (max 30)
    const effectiveQualityScore = qualityScore || (isVerified ? 30 : 25);

    if (platform === 'instagram') {
      // Instagram tier thresholds (max quality score: 30)
      if (
        followers >= 100000 &&
        engagementRate >= 3.0 &&
        effectiveQualityScore >= 30
      ) {
        return 1;
      }
      if (
        followers >= 50000 &&
        followers < 100000 &&
        engagementRate >= 2.0 &&
        effectiveQualityScore >= 25
      ) {
        return 2;
      }
      if (
        followers >= 10000 &&
        followers < 50000 &&
        engagementRate >= 1.5 &&
        effectiveQualityScore >= 20
      ) {
        return 3;
      }
      if (
        followers >= 5000 &&
        followers < 10000 &&
        engagementRate >= 1.0 &&
        effectiveQualityScore >= 15
      ) {
        return 4;
      }
      return 0;
    }

    if (platform === 'tiktok') {
      // TikTok tier thresholds (max quality score: 30)
      if (
        followers >= 100000 &&
        engagementRate >= 3.0 &&
        effectiveQualityScore >= 30
      ) {
        return 1;
      }
      if (
        followers >= 50000 &&
        followers < 100000 &&
        engagementRate >= 2.5 &&
        effectiveQualityScore >= 25
      ) {
        return 2;
      }
      if (
        followers >= 10000 &&
        followers < 50000 &&
        engagementRate >= 2.0 &&
        effectiveQualityScore >= 20
      ) {
        return 3;
      }
      if (
        followers >= 5000 &&
        followers < 10000 &&
        engagementRate >= 1.5 &&
        effectiveQualityScore >= 15
      ) {
        return 4;
      }
      return 0;
    }

    if (platform === 'twitter') {
      // Twitter tier based primarily on followers
      if (followers >= 100000) return 1;
      if (followers >= 50000) return 2;
      if (followers >= 20000) return 3;
      if (followers >= 5000) return 4;
      return 0;
    }

    return 0;
  }

  // 5. Verify All Creator Profiles
  static async verifyCreator(socialLinks: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
  }): Promise<{
    success: boolean;
    tier: number;
    analytics: Record<string, InstagramAnalytics | TikTokAnalytics | TwitterAnalytics>;
    errors: string[];
    qualityScore?: number;
  }> {
    const analytics: Record<string, InstagramAnalytics | TikTokAnalytics | TwitterAnalytics> = {};
    const errors: string[] = [];
    let highestTier = 0;
    let totalQuality = 0;
    let platformCount = 0;

    // Verify Instagram
    if (socialLinks.instagram) {
      const username = this.extractUsername(socialLinks.instagram, 'instagram');
      console.log('Instagram URL extraction:', {
        originalUrl: socialLinks.instagram,
        extractedUsername: username,
      });
      
      if (!username) {
        errors.push('Instagram: Invalid URL format. Please provide a full URL like https://instagram.com/username');
      } else {
        const result = await this.getInstagramProfile(username);

        if (result.success && result.data) {
        // Calculate quality score
        const quality = Math.min(100,
          (result.data.engagementRate * 10) +
          (result.data.profile.is_verified ? 20 : 0) +
          (result.data.profile.media_count > 100 ? 10 : 0)
        );
        totalQuality += quality;
        platformCount++;

        const tier = this.calculateTier(
          'instagram',
          result.data.profile.follower_count,
          result.data.engagementRate,
          result.data.profile.is_verified,
          quality
        );
        highestTier = Math.max(highestTier, tier);

        // Convert to normalized format
        analytics.instagram = {
          username: result.data.profile.username,
          followers: result.data.profile.follower_count,
          following: result.data.profile.following_count,
          posts: result.data.profile.media_count,
          engagementRate: result.data.engagementRate,
          avgLikes: result.data.avgLikes,
          avgComments: result.data.avgComments,
          fakeFollowerPercent: 0, // Not available from SociaVault
          qualityScore: quality,
          audienceDemographics: {
            ageGroups: {},
            genderRatio: { male: 0, female: 0 },
            topCountries: [],
          },
        };
        } else {
          errors.push(`Instagram: ${result.error}`);
        }
      }
    }

    // Verify TikTok
    if (socialLinks.tiktok) {
      const username = this.extractUsername(socialLinks.tiktok, 'tiktok');
      const result = await this.getTikTokProfile(username);

      if (result.success && result.data) {
        const quality = Math.min(100,
          (result.data.engagementRate * 8) +
          (result.data.profile.verified ? 20 : 0) +
          (result.data.profile.videoCount > 50 ? 10 : 0)
        );
        totalQuality += quality;
        platformCount++;

        const tier = this.calculateTier(
          'tiktok',
          result.data.profile.followerCount,
          result.data.engagementRate,
          result.data.profile.verified,
          quality
        );
        highestTier = Math.max(highestTier, tier);

        analytics.tiktok = {
          username: result.data.profile.uniqueId,
          followers: result.data.profile.followerCount,
          following: result.data.profile.followingCount,
          videos: result.data.profile.videoCount,
          hearts: result.data.profile.heartCount,
          engagementRate: result.data.engagementRate,
          avgViews: result.data.avgViews,
          avgLikes: result.data.avgLikes,
          qualityScore: quality,
        };
      } else {
        errors.push(`TikTok: ${result.error}`);
      }
    }

    // Verify Twitter
    if (socialLinks.twitter) {
      const username = this.extractUsername(socialLinks.twitter, 'twitter');
      const result = await this.getTwitterProfile(username);

      if (result.success && result.data) {
        const quality = Math.min(100,
          (result.data.profile.followers_count / 5000) +
          (result.data.profile.verified ? 20 : 0) +
          (result.data.profile.tweet_count > 1000 ? 10 : 0)
        );
        totalQuality += quality;
        platformCount++;

        const tier = this.calculateTier(
          'twitter',
          result.data.profile.followers_count,
          result.data.engagementRate,
          result.data.profile.verified,
          quality
        );
        highestTier = Math.max(highestTier, tier);

        analytics.twitter = {
          username: result.data.profile.username,
          followers: result.data.profile.followers_count,
          following: result.data.profile.following_count,
          tweets: result.data.profile.tweet_count,
          engagementRate: result.data.engagementRate,
          avgRetweets: 0, // Not available from SociaVault
          avgLikes: 0, // Not available from SociaVault
          qualityScore: quality,
        };
      } else {
        errors.push(`Twitter: ${result.error}`);
      }
    }

    const qualityScore = platformCount > 0 ? Math.round(totalQuality / platformCount) : 0;

    return {
      success: Object.keys(analytics).length > 0,
      tier: highestTier,
      analytics,
      errors,
      qualityScore,
    };
  }

  // Helper: Extract username from URL
  private static extractUsername(
    url: string,
    platform: 'instagram' | 'tiktok' | 'twitter'
  ): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Trim whitespace
    const cleanUrl = url.trim();
    
    // If it's already just a username (no http/https), return it cleaned
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return cleanUrl.replace(/^@/, '').split('/')[0].split('?')[0];
    }

    try {
      const urlObj = new URL(cleanUrl);
      const pathname = urlObj.pathname;

      if (platform === 'instagram') {
        // Handle instagram.com/username or www.instagram.com/username
        const parts = pathname.split('/').filter(Boolean);
        return parts[0] || '';
      } else if (platform === 'tiktok') {
        // Handle tiktok.com/@username or tiktok.com/username
        const username = pathname.split('/').filter(Boolean)[0];
        return username.replace(/^@/, '');
      } else if (platform === 'twitter') {
        // Handle twitter.com/username or x.com/username
        const parts = pathname.split('/').filter(Boolean);
        return parts[0] || '';
      }

      return '';
    } catch (error) {
      // If URL parsing fails, try to extract username manually
      console.warn('URL parsing failed, attempting manual extraction:', cleanUrl);
      
      // Try to extract username from common patterns
      const patterns: Record<string, RegExp> = {
        instagram: /(?:instagram\.com\/|instagr\.am\/)([^\/\?]+)/i,
        tiktok: /(?:tiktok\.com\/@?)([^\/\?]+)/i,
        twitter: /(?:twitter\.com\/|x\.com\/)([^\/\?]+)/i,
      };

      const pattern = patterns[platform];
      if (pattern) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) {
          return match[1].replace(/^@/, '');
        }
      }

      // Last resort: remove @ and take first part
      return cleanUrl.replace(/^@/, '').split('/').filter(Boolean)[0]?.split('?')[0] || '';
    }
  }
}