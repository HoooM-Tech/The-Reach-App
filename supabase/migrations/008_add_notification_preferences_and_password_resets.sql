-- Add notification_preferences column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "contractUpdate": true,
  "newLeads": true,
  "inspectionBookings": true,
  "handoverReminders": true,
  "payoutUpdate": true
}'::jsonb;

-- Create password_resets table for password reset codes
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(code);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- Add comment
COMMENT ON COLUMN users.notification_preferences IS 'User notification preferences stored as JSONB';
