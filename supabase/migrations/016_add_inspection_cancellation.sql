-- Add cancellation tracking columns to inspections table
-- cancelled_at already exists from initial schema, add cancelled_by

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(30)
    CHECK (cancelled_by IN ('buyer', 'developer', 'admin'));

-- Add index for filtering by status efficiently
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);

-- ===========================================
-- RLS: Allow buyers to UPDATE their own inspections
-- This enables buyers to cancel inspections they own
-- ===========================================

CREATE POLICY "Buyers can update own inspections" ON inspections
  FOR UPDATE
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- ===========================================
-- Comment documenting cancellation flow
-- ===========================================

COMMENT ON COLUMN inspections.cancelled_by IS
  'Who cancelled the inspection: buyer, developer, or admin. NULL if not cancelled.';

COMMENT ON COLUMN inspections.cancelled_at IS
  'Timestamp when the inspection was cancelled. NULL if not cancelled.';
