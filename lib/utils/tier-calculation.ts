/**
 * Creator Tier Calculation (Authoritative Spec)
 * 
 * These tiers are mutually exclusive and must be evaluated top-down (Tier 1 → Tier 4).
 * A creator qualifies for a tier only if ALL conditions for that tier are met.
 */

export interface TierCalculationInput {
  followers: number;
  engagementRate: number;
  qualityScore: number;
}

export interface TierCalculationResult {
  tier: number;
  commission: number;
  qualified: boolean;
}

/**
 * Calculate creator tier based on exact specification
 * 
 * Tier 1 - Elite Creator: 3% commission
 * - Followers: ≥ 100,000
 * - Engagement Rate: ≥ 3.0%
 * - Quality Score: ≥ 85
 * 
 * Tier 2 - Professional Creator: 2.5% commission
 * - Followers: 50,000 – 99,999
 * - Engagement Rate: 2.0% – 2.99%
 * - Quality Score: ≥ 70
 * 
 * Tier 3 - Rising Creator: 2% commission
 * - Followers: 10,000 – 49,999
 * - Engagement Rate: 1.5% – 1.99%
 * - Quality Score: ≥ 60
 * 
 * Tier 4 - Micro Creator: 1.5% commission
 * - Followers: 5,000 – 9,999
 * - Engagement Rate: ≥ 1.0%
 * - Quality Score: ≥ 50
 * 
 * Not Qualified (Tier 0): 0% commission
 * - Followers < 5,000 OR
 * - Engagement < 1.0% OR
 * - Quality score < 50
 */
export function calculateCreatorTier(input: TierCalculationInput): TierCalculationResult {
  const { followers, engagementRate, qualityScore } = input;

  // Validate inputs
  if (!followers || followers <= 0 || isNaN(followers)) {
    return { tier: 0, commission: 0, qualified: false };
  }

  if (isNaN(engagementRate) || engagementRate < 0) {
    return { tier: 0, commission: 0, qualified: false };
  }

  if (isNaN(qualityScore) || qualityScore < 0) {
    return { tier: 0, commission: 0, qualified: false };
  }

  // Tier 1 - Elite Creator (3% commission)
  if (
    followers >= 100000 &&
    engagementRate >= 3.0 &&
    qualityScore >= 85
  ) {
    return { tier: 1, commission: 3.0, qualified: true };
  }

  // Tier 2 - Professional Creator (2.5% commission)
  if (
    followers >= 50000 &&
    followers < 100000 &&
    engagementRate >= 2.0 &&
    engagementRate < 3.0 &&
    qualityScore >= 70
  ) {
    return { tier: 2, commission: 2.5, qualified: true };
  }

  // Tier 3 - Rising Creator (2% commission)
  if (
    followers >= 10000 &&
    followers < 50000 &&
    engagementRate >= 1.5 &&
    engagementRate < 2.0 &&
    qualityScore >= 60
  ) {
    return { tier: 3, commission: 2.0, qualified: true };
  }

  // Tier 4 - Micro Creator (1.5% commission)
  if (
    followers >= 5000 &&
    followers < 10000 &&
    engagementRate >= 1.0 &&
    qualityScore >= 50
  ) {
    return { tier: 4, commission: 1.5, qualified: true };
  }

  // Not Qualified
  return { tier: 0, commission: 0, qualified: false };
}

/**
 * Calculate tier from multiple platforms
 * Returns the highest valid tier across all platforms
 */
export function calculateTierFromMultiplePlatforms(
  platforms: Array<{
    followers: number;
    engagementRate: number;
    qualityScore: number;
  }>
): TierCalculationResult {
  let highestTier = 0;
  let highestCommission = 0;
  let hasQualified = false;

  for (const platform of platforms) {
    const result = calculateCreatorTier(platform);
    if (result.qualified && result.tier > highestTier) {
      highestTier = result.tier;
      highestCommission = result.commission;
      hasQualified = true;
    }
  }

  return {
    tier: highestTier,
    commission: highestCommission,
    qualified: hasQualified,
  };
}

/**
 * Calculate engagement rate from likes and comments
 * engagementRate = ((avgLikes + avgComments) / followers) * 100
 */
export function calculateEngagementRate(
  followers: number,
  avgLikes: number,
  avgComments: number
): number {
  if (!followers || followers <= 0) {
    return 0;
  }
  return ((avgLikes + avgComments) / followers) * 100;
}
