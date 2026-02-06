/**
 * Tier Calculator - Aggregates followers across all platforms
 * 
 * CRITICAL: This calculator SUMS followers from all connected platforms,
 * then calculates tier based on the total follower count.
 */

export interface SocialMetrics {
  twitter?: {
    followers: number;
    following?: number;
    tweets?: number;
    engagement?: number;
  };
  instagram?: {
    followers: number;
    following?: number;
    posts?: number;
    engagement?: number;
  };
  facebook?: {
    followers: number;
    engagement?: number;
  };
  tiktok?: {
    followers: number;
    engagement?: number;
  };
}

export interface TierResult {
  tier: 1 | 2 | 3 | 4 | null; // null = disqualified
  tierName: string;
  totalFollowers: number;
  engagementRate: number;
  qualityScore: number;
  meetsRequirements: boolean;
  reason?: string;
}

/**
 * Calculate tier based on AGGREGATED followers across all platforms.
 * Mega accounts (100M+) get automatic Tier 1; major accounts (10M+, 1M+) get relaxed Tier 1 requirements.
 */
export function calculateTier(metrics: SocialMetrics): TierResult {
  const totalFollowers =
    (metrics.twitter?.followers || 0) +
    (metrics.instagram?.followers || 0) +
    (metrics.facebook?.followers || 0) +
    (metrics.tiktok?.followers || 0);

  console.log('\n🔥 TIER CALCULATION START 🔥');
  console.log('================================');
  console.log('📊 Input Metrics:', JSON.stringify(metrics, null, 2));
  console.log('👥 Total Followers:', totalFollowers.toLocaleString());

  if (totalFollowers < 5000) {
    console.log('❌ DISQUALIFIED: Below 5K followers');
    console.log('================================\n');
    return {
      tier: null,
      tierName: 'Disqualified',
      totalFollowers,
      engagementRate: 0,
      qualityScore: 0,
      meetsRequirements: false,
      reason: 'Total followers below minimum requirement of 5,000',
    };
  }

  const engagementRate = calculateEngagementRate(metrics);
  const qualityScore = calculateQualityScore(metrics);

  console.log('📈 Calculated Metrics:');
  console.log('  - Total Followers:', totalFollowers.toLocaleString());
  console.log('  - Engagement Rate:', `${engagementRate.toFixed(2)}%`);
  console.log('  - Quality Score:', qualityScore);

  // Mega accounts (100M+): Automatic Tier 1
  if (totalFollowers >= 100000000) {
    console.log('🌟🌟🌟 MEGA ACCOUNT DETECTED: 100M+ followers');
    console.log('✅ AUTOMATIC TIER 1 ASSIGNMENT');
    console.log('================================\n');
    return {
      tier: 1,
      tierName: 'Elite - Tier 1',
      totalFollowers,
      engagementRate,
      qualityScore,
      meetsRequirements: true,
    };
  }

  // Major accounts (10M–100M): Tier 1 with relaxed requirements
  if (totalFollowers >= 10000000) {
    console.log('🌟🌟 MAJOR ACCOUNT DETECTED: 10M+ followers');
    if (engagementRate >= 2 || qualityScore >= 70) {
      console.log('✅ TIER 1 ASSIGNED (relaxed requirements for major account)');
      console.log('================================\n');
      return {
        tier: 1,
        tierName: 'Elite - Tier 1',
        totalFollowers,
        engagementRate,
        qualityScore,
        meetsRequirements: true,
      };
    }
  }

  // Tier 1: 100K+ followers — standard and relaxed paths
  if (totalFollowers >= 100000) {
    console.log('🎯 Evaluating for TIER 1 (100K+ followers)');
    console.log('  Required: Engagement ≥3% AND Quality ≥85');
    console.log(`  Actual: Engagement ${engagementRate.toFixed(2)}% | Quality ${qualityScore}`);

    if (engagementRate >= 3 && qualityScore >= 85) {
      console.log('✅ TIER 1 ASSIGNED (meets all requirements)');
      console.log('================================\n');
      return {
        tier: 1,
        tierName: 'Elite - Tier 1',
        totalFollowers,
        engagementRate,
        qualityScore,
        meetsRequirements: true,
      };
    }

    // 100K–1M: relaxed Tier 1
    if (totalFollowers < 1000000) {
      if (engagementRate >= 2.5 || qualityScore >= 75) {
        console.log('✅ TIER 1 ASSIGNED (relaxed for 100K–1M range)');
        console.log('================================\n');
        return {
          tier: 1,
          tierName: 'Elite - Tier 1',
          totalFollowers,
          engagementRate,
          qualityScore,
          meetsRequirements: true,
        };
      }
    }

    // 1M+ with relaxed engagement/quality
    if (totalFollowers >= 1000000) {
      if (engagementRate >= 2 || qualityScore >= 70) {
        console.log('✅ TIER 1 ASSIGNED (1M+ follower bonus)');
        console.log('================================\n');
        return {
          tier: 1,
          tierName: 'Elite - Tier 1',
          totalFollowers,
          engagementRate,
          qualityScore,
          meetsRequirements: true,
          reason: '1M+ followers qualify for Tier 1 with relaxed engagement requirements',
        };
      }
    }

    console.log('⚠️ 100K+ followers but insufficient engagement/quality');
    console.log('📍 Assigning TIER 2');
    console.log('================================\n');
    return {
      tier: 2,
      tierName: 'Premium - Tier 2',
      totalFollowers,
      engagementRate,
      qualityScore,
      meetsRequirements: true,
      reason: 'Followers sufficient for Tier 1, but engagement or quality below threshold',
    };
  }

  // Tier 2: 50K–100K
  if (totalFollowers >= 50000 && totalFollowers < 100000) {
    console.log('🎯 Evaluating for TIER 2 (50K–100K followers)');
    if (engagementRate >= 2 && qualityScore >= 70) {
      console.log('✅ TIER 2 ASSIGNED');
      console.log('================================\n');
      return {
        tier: 2,
        tierName: 'Premium - Tier 2',
        totalFollowers,
        engagementRate,
        qualityScore,
        meetsRequirements: true,
      };
    }
    console.log('⚠️ 50K+ but insufficient engagement/quality, assigning Tier 3');
    console.log('================================\n');
    return {
      tier: 3,
      tierName: 'Advanced - Tier 3',
      totalFollowers,
      engagementRate,
      qualityScore,
      meetsRequirements: true,
      reason: 'Followers sufficient for Tier 2, but engagement or quality below threshold',
    };
  }

  // Tier 3: 10K–50K
  if (totalFollowers >= 10000 && totalFollowers < 50000) {
    console.log('🎯 Evaluating for TIER 3 (10K–50K followers)');
    if (engagementRate >= 1.5 && qualityScore >= 60) {
      console.log('✅ TIER 3 ASSIGNED');
      console.log('================================\n');
      return {
        tier: 3,
        tierName: 'Advanced - Tier 3',
        totalFollowers,
        engagementRate,
        qualityScore,
        meetsRequirements: true,
      };
    }
    console.log('⚠️ 10K+ but insufficient engagement/quality, assigning Tier 4');
    console.log('================================\n');
    return {
      tier: 4,
      tierName: 'Growing - Tier 4',
      totalFollowers,
      engagementRate,
      qualityScore,
      meetsRequirements: true,
      reason: 'Followers sufficient for Tier 3, but engagement or quality below threshold',
    };
  }

  // Tier 4: 5K–10K
  if (totalFollowers >= 5000 && totalFollowers < 10000) {
    console.log('🎯 Evaluating for TIER 4 (5K–10K followers)');
    if (engagementRate >= 1 && qualityScore >= 50) {
      console.log('✅ TIER 4 ASSIGNED');
      console.log('================================\n');
      return {
        tier: 4,
        tierName: 'Growing - Tier 4',
        totalFollowers,
        engagementRate,
        qualityScore,
        meetsRequirements: true,
      };
    }
    console.log('❌ 5K+ but insufficient engagement/quality');
    console.log('================================\n');
    return {
      tier: null,
      tierName: 'Disqualified',
      totalFollowers,
      engagementRate,
      qualityScore,
      meetsRequirements: false,
      reason: 'Followers sufficient but engagement or quality below minimum requirements',
    };
  }

  console.log('❌ Unexpected case in tier calculation');
  console.log('================================\n');
  return {
    tier: null,
    tierName: 'Disqualified',
    totalFollowers,
    engagementRate,
    qualityScore,
    meetsRequirements: false,
    reason: 'Unable to determine tier',
  };
}

/**
 * Calculate average engagement rate across all platforms.
 * For mega accounts (1M+ followers), post/follower ratio returns near 0% — use tiered defaults instead.
 */
function calculateEngagementRate(metrics: SocialMetrics): number {
  const engagementRates: number[] = [];

  // Twitter engagement
  if (metrics.twitter?.engagement && metrics.twitter.engagement > 0) {
    engagementRates.push(metrics.twitter.engagement);
  } else if (metrics.twitter?.followers) {
    const followers = metrics.twitter.followers;
    let defaultEngagement = 2;
    if (followers >= 10000000) defaultEngagement = 3.5;
    else if (followers >= 1000000) defaultEngagement = 3;
    else if (followers >= 100000) defaultEngagement = 2.5;
    else if (metrics.twitter.tweets && metrics.twitter.followers > 0) {
      const tweetRatio = metrics.twitter.tweets / metrics.twitter.followers;
      const estimated = Math.min(tweetRatio * 50, 5);
      if (estimated > 0.1) defaultEngagement = estimated;
    }
    engagementRates.push(defaultEngagement);
  }

  // Instagram engagement — BUG FIX: for mega accounts, post/follower ratio ≈ 0; use tiered defaults
  if (metrics.instagram?.engagement && metrics.instagram.engagement > 0) {
    engagementRates.push(metrics.instagram.engagement);
  } else if (metrics.instagram?.followers) {
    const followers = metrics.instagram.followers;
    let defaultEngagement = 2;
    if (followers >= 100000000) defaultEngagement = 3.5;
    else if (followers >= 10000000) defaultEngagement = 3;
    else if (followers >= 1000000) defaultEngagement = 2.5;
    else if (followers >= 100000) defaultEngagement = 2;
    else if (metrics.instagram.posts && metrics.instagram.followers > 0) {
      const postRatio = metrics.instagram.posts / metrics.instagram.followers;
      const estimated = Math.min(postRatio * 50, 5);
      if (estimated > 0.1) defaultEngagement = estimated;
    }
    console.log(`📊 Instagram default engagement for ${followers.toLocaleString()} followers: ${defaultEngagement}%`);
    engagementRates.push(defaultEngagement);
  }

  // Facebook engagement
  if (metrics.facebook?.engagement && metrics.facebook.engagement > 0) {
    engagementRates.push(metrics.facebook.engagement);
  } else if (metrics.facebook?.followers) {
    const followers = metrics.facebook.followers;
    engagementRates.push(followers >= 1000000 ? 3 : 2);
  }

  // TikTok engagement
  if (metrics.tiktok?.engagement && metrics.tiktok.engagement > 0) {
    engagementRates.push(metrics.tiktok.engagement);
  } else if (metrics.tiktok?.followers) {
    const followers = metrics.tiktok.followers;
    engagementRates.push(followers >= 1000000 ? 3.5 : 2.5);
  }

  if (engagementRates.length === 0) {
    console.log('⚠️ No engagement data available, using default 3%');
    return 3;
  }

  const avgEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
  if (avgEngagement < 1 && engagementRates.length > 0) {
    console.log('⚠️ Calculated engagement below 1%, using minimum 1%');
    return 1;
  }

  console.log('📊 Engagement Calculation:', { rates: engagementRates, average: `${avgEngagement.toFixed(2)}%` });
  return avgEngagement;
}

/**
 * Calculate quality score based on account characteristics.
 * Mega accounts (100M+, 10M+, 1M+) get automatic high scores so they qualify for Tier 1.
 */
function calculateQualityScore(metrics: SocialMetrics): number {
  let score = 0;
  let factors = 0;

  // Twitter quality indicators
  if (metrics.twitter && metrics.twitter.followers > 0) {
    factors++;
    const followers = metrics.twitter.followers;
    let platformScore = 0;
    if (followers >= 100000000) platformScore = 95;
    else if (followers >= 10000000) platformScore = 90;
    else if (followers >= 1000000) platformScore = 85;
    else if (followers >= 100000) platformScore = 90;
    else if (followers >= 50000) platformScore = 85;
    else if (followers >= 10000) platformScore = 75;
    else if (followers >= 5000) platformScore = 65;
    else platformScore = 55;
    if (metrics.twitter.following && metrics.twitter.following > 0) {
      const ratio = metrics.twitter.followers / metrics.twitter.following;
      if (ratio > 2) platformScore += 10;
      else if (ratio > 1) platformScore += 5;
    }
    if (metrics.twitter.tweets && metrics.twitter.tweets > 100) platformScore += 5;
    score += Math.min(platformScore, 100);
  }

  // Instagram quality indicators — mega accounts get automatic high scores
  if (metrics.instagram && metrics.instagram.followers > 0) {
    factors++;
    const followers = metrics.instagram.followers;
    let platformScore = 0;
    if (followers >= 100000000) {
      platformScore = 95;
      console.log('🌟 Mega account (100M+): Quality score 95');
    } else if (followers >= 10000000) {
      platformScore = 90;
      console.log('🌟 Large account (10M+): Quality score 90');
    } else if (followers >= 1000000) {
      platformScore = 85;
      console.log('🌟 Major account (1M+): Quality score 85');
    } else if (followers >= 100000) platformScore = 80;
    else if (followers >= 50000) platformScore = 85;
    else if (followers >= 10000) platformScore = 75;
    else if (followers >= 5000) platformScore = 65;
    else platformScore = 55;
    if (metrics.instagram.following && metrics.instagram.following > 0) {
      const ratio = metrics.instagram.followers / metrics.instagram.following;
      if (ratio > 2) platformScore += 10;
      else if (ratio > 1) platformScore += 5;
    }
    if (metrics.instagram.posts && metrics.instagram.posts > 50) platformScore += 5;
    score += Math.min(platformScore, 100);
  }

  // Facebook quality
  if (metrics.facebook && metrics.facebook.followers > 0) {
    factors++;
    const followers = metrics.facebook.followers;
    let platformScore = 0;
    if (followers >= 1000000) platformScore = 90;
    else if (followers >= 100000) platformScore = 85;
    else if (followers >= 10000) platformScore = 75;
    else if (followers >= 5000) platformScore = 65;
    else platformScore = 55;
    score += platformScore;
  }

  // TikTok quality
  if (metrics.tiktok && metrics.tiktok.followers > 0) {
    factors++;
    const followers = metrics.tiktok.followers;
    let platformScore = 0;
    if (followers >= 10000000) platformScore = 95;
    else if (followers >= 1000000) platformScore = 90;
    else if (followers >= 100000) platformScore = 85;
    else if (followers >= 50000) platformScore = 85;
    else if (followers >= 10000) platformScore = 75;
    else if (followers >= 5000) platformScore = 65;
    else platformScore = 55;
    score += platformScore;
  }

  const qualityScore = factors > 0 ? Math.max(50, score / factors) : 70;
  console.log('🎯 Quality Score:', { totalScore: score, factors, averageScore: qualityScore.toFixed(0) });
  return Math.round(qualityScore);
}

/**
 * Get tier benefits
 */
export function getTierBenefits(tier: 1 | 2 | 3 | 4 | null): string[] {
  if (tier === null) {
    return ['Does not meet minimum requirements for creator program'];
  }
  
  const benefits = {
    1: [
      'Highest commission rate (3%)',
      'VIP support',
      'Featured promotions',
      'Exclusive partnerships',
      'Premium analytics dashboard'
    ],
    2: [
      'Enhanced commission rate (2.5%)',
      'Priority support',
      'Advanced analytics',
      'Featured listings',
      'Dedicated account manager'
    ],
    3: [
      'Standard commission rate (2%)',
      'Standard support',
      'Basic analytics',
      'Regular promotions'
    ],
    4: [
      'Basic commission rate (1.5%)',
      'Email support',
      'Entry-level analytics',
      'Promotional opportunities'
    ]
  };
  
  return benefits[tier];
}

/**
 * Get tier display info
 */
export function getTierDisplayInfo(tier: 1 | 2 | 3 | 4 | null) {
  if (tier === null) {
    return {
      name: 'Disqualified',
      icon: '❌',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300'
    };
  }
  
  const tiers = {
    1: {
      name: 'Elite - Tier 1',
      icon: '💎',
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      borderColor: 'border-purple-300'
    },
    2: {
      name: 'Premium - Tier 2',
      icon: '🥇',
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300'
    },
    3: {
      name: 'Advanced - Tier 3',
      icon: '🥈',
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-300'
    },
    4: {
      name: 'Growing - Tier 4',
      icon: '🥉',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300'
    }
  };
  
  return tiers[tier];
}
