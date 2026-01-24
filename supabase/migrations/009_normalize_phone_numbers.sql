-- Migration: Normalize all phone numbers to E.164 format (+234XXXXXXXXXX)
-- This migration converts all existing phone numbers from local format (0XXXXXXXXXX) to E.164 format

-- Update users table
UPDATE users
SET phone = '+234' || SUBSTRING(phone FROM 2)
WHERE phone IS NOT NULL 
  AND phone ~ '^0\d{10}$'
  AND phone NOT LIKE '+234%';

-- Update leads table
UPDATE leads
SET buyer_phone = '+234' || SUBSTRING(buyer_phone FROM 2)
WHERE buyer_phone IS NOT NULL 
  AND buyer_phone ~ '^0\d{10}$'
  AND buyer_phone NOT LIKE '+234%';

-- Update inspections table (if it has buyer_phone field)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspections' AND column_name = 'buyer_phone'
  ) THEN
    UPDATE inspections
    SET buyer_phone = '+234' || SUBSTRING(buyer_phone FROM 2)
    WHERE buyer_phone IS NOT NULL 
      AND buyer_phone ~ '^0\d{10}$'
      AND buyer_phone NOT LIKE '+234%';
  END IF;
END $$;

-- Add comment to phone columns indicating E.164 format requirement
COMMENT ON COLUMN users.phone IS 'Phone number in E.164 format (+234XXXXXXXXXX)';
COMMENT ON COLUMN leads.buyer_phone IS 'Phone number in E.164 format (+234XXXXXXXXXX)';
