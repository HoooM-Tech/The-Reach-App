-- Fix inspection slot_time column to use TIMESTAMPTZ instead of TIMESTAMP
-- This ensures timezone-aware storage and prevents timezone conversion errors

-- First, check if column exists and what type it is
DO $$
BEGIN
  -- Alter the column to TIMESTAMPTZ if it's currently TIMESTAMP
  -- This preserves existing data but ensures future times are stored with timezone info
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'inspections' 
    AND column_name = 'slot_time'
    AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE inspections 
    ALTER COLUMN slot_time TYPE TIMESTAMPTZ USING slot_time AT TIME ZONE 'UTC';
    
    RAISE NOTICE 'Updated inspections.slot_time from TIMESTAMP to TIMESTAMPTZ';
  ELSE
    RAISE NOTICE 'Column inspections.slot_time is already TIMESTAMPTZ or does not exist';
  END IF;
END $$;

-- Add comment documenting timezone policy
COMMENT ON COLUMN inspections.slot_time IS 
  'Inspection time stored in UTC (TIMESTAMPTZ). All times must be stored as UTC ISO 8601 strings. Display conversion to local time happens only at render time using lib/utils/time.ts';
