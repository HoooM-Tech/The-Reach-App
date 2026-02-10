-- Add confirmed_by for audit (who confirmed the inspection)
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id);

COMMENT ON COLUMN inspections.confirmed_by IS 'User ID of the developer who confirmed the inspection. NULL after buyer reschedule until developer reconfirms.';

-- RLS: Restrict buyer updates so they cannot set status to 'confirmed' or 'completed'
-- Drop existing permissive buyer policy and recreate with status restriction
DROP POLICY IF EXISTS "Buyers can update own inspections" ON inspections;

CREATE POLICY "Buyers can update own inspections" ON inspections
  FOR UPDATE
  USING (buyer_id = auth.uid())
  WITH CHECK (
    buyer_id = auth.uid()
    AND (status IS NULL OR status NOT IN ('confirmed', 'completed'))
  );

COMMENT ON POLICY "Buyers can update own inspections" ON inspections IS
  'Buyers can only set status to booked, pending, or cancelled; cannot set confirmed or completed.';
