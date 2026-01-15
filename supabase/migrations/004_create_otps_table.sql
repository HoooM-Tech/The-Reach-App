-- OTPs table for phone verification
CREATE TABLE IF NOT EXISTS otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_otps_phone ON otps(phone);
CREATE INDEX idx_otps_expires ON otps(expires_at);

-- Clean up expired OTPs (optional: can be done via cron job)
-- DELETE FROM otps WHERE expires_at < NOW();

