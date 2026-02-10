-- Inspection completion and withdrawal tracking
-- completed_at: when developer marked inspection as complete
-- completion_notes: optional notes from developer
-- auto_completed: true if system auto-completed after grace period (future use)
-- withdrawn_at: when buyer withdrew interest (after completion)
-- withdrawal_reason: optional reason from buyer

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS auto_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

COMMENT ON COLUMN inspections.completed_at IS 'When the developer marked the physical inspection as complete.';
COMMENT ON COLUMN inspections.completion_notes IS 'Optional notes from the developer when completing the inspection.';
COMMENT ON COLUMN inspections.auto_completed IS 'True if the system auto-completed the inspection after a grace period.';
COMMENT ON COLUMN inspections.withdrawn_at IS 'When the buyer withdrew interest after inspection was completed.';
COMMENT ON COLUMN inspections.withdrawal_reason IS 'Optional reason provided by the buyer when withdrawing interest.';
