-- Add push_subscription column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_push_subscription 
ON users USING GIN (push_subscription);

-- Optional: Create a separate table for multiple device subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

