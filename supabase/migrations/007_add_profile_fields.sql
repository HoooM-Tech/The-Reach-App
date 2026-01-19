-- Add profile fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cac_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS business_address TEXT;

-- Create index for company name lookups
CREATE INDEX IF NOT EXISTS idx_users_company_name ON users(company_name);

-- Add comment for profile fields
COMMENT ON COLUMN users.avatar_url IS 'Profile picture URL stored in Supabase Storage';
COMMENT ON COLUMN users.company_name IS 'Company or business name (for developers)';
COMMENT ON COLUMN users.cac_number IS 'Corporate Affairs Commission number (for developers)';
COMMENT ON COLUMN users.business_address IS 'Business address (for developers)';
