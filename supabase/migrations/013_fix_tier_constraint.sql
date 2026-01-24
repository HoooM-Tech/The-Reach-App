-- Fix tier constraint to allow tier 0 (unqualified creators) and NULL
-- The tier calculation can return 0 for unqualified creators

-- Update users table tier constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_tier_check;

ALTER TABLE users
ADD CONSTRAINT users_tier_check CHECK (tier IS NULL OR (tier >= 0 AND tier <= 4));

-- Update creator_analytics_history table tier constraint
ALTER TABLE creator_analytics_history
DROP CONSTRAINT IF EXISTS creator_analytics_history_tier_check;

ALTER TABLE creator_analytics_history
ADD CONSTRAINT creator_analytics_history_tier_check CHECK (tier >= 0 AND tier <= 4);
