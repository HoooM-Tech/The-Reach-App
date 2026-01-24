-- Add promotion lifecycle fields to tracking_links
-- Status can be: 'active', 'paused', 'stopped', 'expired'

ALTER TABLE tracking_links
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'expired'));

ALTER TABLE tracking_links
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

ALTER TABLE tracking_links
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

ALTER TABLE tracking_links
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;

ALTER TABLE tracking_links
ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMP;

ALTER TABLE tracking_links
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;

ALTER TABLE tracking_links
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes for status filtering and expiration queries
CREATE INDEX IF NOT EXISTS idx_tracking_links_status ON tracking_links(status);
CREATE INDEX IF NOT EXISTS idx_tracking_links_expires_at ON tracking_links(expires_at) WHERE expires_at IS NOT NULL;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tracking_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tracking_links_updated_at ON tracking_links;
CREATE TRIGGER tracking_links_updated_at
BEFORE UPDATE ON tracking_links
FOR EACH ROW
EXECUTE FUNCTION update_tracking_links_updated_at();

-- Update existing records to have 'active' status and set started_at to created_at
UPDATE tracking_links
SET 
  status = COALESCE(status, 'active'),
  started_at = COALESCE(started_at, created_at),
  updated_at = COALESCE(updated_at, NOW())
WHERE status IS NULL OR started_at IS NULL OR updated_at IS NULL;
