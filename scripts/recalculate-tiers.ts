/**
 * Script to recalculate tiers for all creators using aggregated followers
 * 
 * Usage: npx ts-node scripts/recalculate-tiers.ts
 */

import { createAdminSupabaseClient } from '../lib/supabase/server';
import { calculateTier, type SocialMetrics } from '../lib/utils/tier-calculator';

async function recalculateAllTiers() {
  console.log('🔄 Starting tier recalculation for all creators...\n');
  
  const adminSupabase = createAdminSupabaseClient();

  // Get all creators
  const { data: creators, error: creatorsError } = await adminSupabase
    .from('users')
    .select('id, full_name, email, tier')
    .eq('role', 'creator');

  if (creatorsError) {
    console.error('❌ Error fetching creators:', creatorsError);
    process.exit(1);
  }

  if (!creators || creators.length === 0) {
    console.log('No creators found');
    process.exit(0);
  }

  console.log(`Found ${creators.length} creators\n`);

  let updated = 0;
  let failed = 0;

  for (const creator of creators) {
    try {
      console.log(`\n📊 Processing creator: ${creator.full_name || creator.email} (${creator.id})`);

      // Get all verified social accounts
      const { data: socialAccounts } = await adminSupabase
        .from('social_accounts')
        .select('platform, followers, engagement_rate')
        .eq('user_id', creator.id)
        .not('verified_at', 'is', null);

      if (!socialAccounts || socialAccounts.length === 0) {
        console.log(`  ⚠️  No verified social accounts, setting tier to null`);
        await adminSupabase
          .from('users')
          .update({ tier: null })
          .eq('id', creator.id);
        continue;
      }

      // Build metrics object
      const metrics: SocialMetrics = {};

      socialAccounts.forEach((account) => {
        const platform = account.platform.toLowerCase();
        const followers = account.followers || 0;
        const engagement = account.engagement_rate || 0;

        console.log(`  - ${platform}: ${followers.toLocaleString()} followers, ${engagement.toFixed(2)}% engagement`);

        if (platform === 'twitter' || platform === 'x') {
          metrics.twitter = {
            followers,
            following: 0,
            engagement,
          };
        } else if (platform === 'instagram') {
          metrics.instagram = {
            followers,
            following: 0,
            engagement,
          };
        } else if (platform === 'tiktok') {
          metrics.tiktok = {
            followers,
            engagement,
          };
        } else if (platform === 'facebook') {
          metrics.facebook = {
            followers,
            engagement,
          };
        }
      });

      // Calculate new tier using aggregated followers
      const tierResult = calculateTier(metrics);

      console.log(`  ✨ Calculated tier: ${tierResult.tier} (${tierResult.tierName})`);
      console.log(`  📈 Total followers: ${tierResult.totalFollowers.toLocaleString()}`);
      console.log(`  💯 Quality score: ${tierResult.qualityScore}`);
      console.log(`  📊 Engagement rate: ${tierResult.engagementRate.toFixed(2)}%`);

      // Update in database
      const tierValue = tierResult.tier === null ? null : tierResult.tier;
      
      const { error: updateError } = await adminSupabase
        .from('users')
        .update({
          tier: tierValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creator.id);

      if (updateError) {
        console.error(`  ❌ Error updating tier:`, updateError);
        failed++;
      } else {
        console.log(`  ✅ Updated successfully`);
        updated++;
      }

    } catch (error: any) {
      console.error(`  ❌ Error processing creator ${creator.id}:`, error.message);
      failed++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`  Total creators: ${creators.length}`);
  console.log(`  ✅ Successfully updated: ${updated}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`\n✨ Tier recalculation complete!`);
}

// Run the script
recalculateAllTiers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
