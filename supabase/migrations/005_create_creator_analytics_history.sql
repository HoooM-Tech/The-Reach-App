-- Creator Analytics History Table
CREATE TABLE IF NOT EXISTS creator_analytics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 4),
  analytics_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_history_creator ON creator_analytics_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_analytics_history_date ON creator_analytics_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_history_tier ON creator_analytics_history(tier);

