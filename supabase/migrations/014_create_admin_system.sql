-- Create admin system tables
-- Admin actions, disputes, and payouts

-- Admin actions log table
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Action Details
  action VARCHAR(100) NOT NULL, -- 'user_suspended', 'property_verified', etc.
  entity VARCHAR(50) NOT NULL, -- 'user', 'property', 'transaction', etc.
  entity_id UUID,
  
  -- Details
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_entity ON admin_actions(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties
  complainant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  respondent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Dispute Details
  type VARCHAR(50) NOT NULL CHECK (type IN ('property', 'transaction', 'user', 'other')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  
  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]', -- Array of evidence items {type, url, description}
  
  -- Related Entities
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  -- Resolution
  resolution TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  
  -- Admin assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_complainant ON disputes(complainant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent ON disputes(respondent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_type ON disputes(type);
CREATE INDEX IF NOT EXISTS idx_disputes_property ON disputes(property_id);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned ON disputes(assigned_to);

-- Dispute messages table
CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type VARCHAR(50),
  
  -- Visibility
  is_internal BOOLEAN DEFAULT false, -- Internal admin notes
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created ON dispute_messages(created_at DESC);

-- Payouts table - Alter existing table to add missing columns
-- The payouts table already exists from 001_initial_schema.sql
-- Add missing columns if they don't exist

-- Add gross_amount if it doesn't exist (use amount as fallback)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'gross_amount') THEN
    ALTER TABLE payouts ADD COLUMN gross_amount DECIMAL(15,2);
    -- Migrate existing amount to gross_amount
    UPDATE payouts SET gross_amount = amount WHERE gross_amount IS NULL;
    ALTER TABLE payouts ALTER COLUMN gross_amount SET NOT NULL;
  END IF;
END $$;

-- Add platform_fee if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'platform_fee') THEN
    ALTER TABLE payouts ADD COLUMN platform_fee DECIMAL(15,2) DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add net_amount if it doesn't exist (calculate from gross_amount - platform_fee)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'net_amount') THEN
    ALTER TABLE payouts ADD COLUMN net_amount DECIMAL(15,2);
    -- Calculate net_amount from existing data
    UPDATE payouts SET net_amount = COALESCE(gross_amount, amount) - COALESCE(platform_fee, 0) WHERE net_amount IS NULL;
    ALTER TABLE payouts ALTER COLUMN net_amount SET NOT NULL;
  END IF;
END $$;

-- Update status constraint if needed
DO $$ 
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
  -- Add new constraint
  ALTER TABLE payouts ADD CONSTRAINT payouts_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'requested'));
END $$;

-- Add payment_method if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'payment_method') THEN
    ALTER TABLE payouts ADD COLUMN payment_method VARCHAR(50) DEFAULT 'bank_transfer';
  END IF;
END $$;

-- Add payment_reference if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'payment_reference') THEN
    ALTER TABLE payouts ADD COLUMN payment_reference VARCHAR(255);
  END IF;
END $$;

-- Add bank_account_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'bank_account_id') THEN
    ALTER TABLE payouts ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add due_date if it doesn't exist (default to created_at + 7 days)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'due_date') THEN
    ALTER TABLE payouts ADD COLUMN due_date TIMESTAMP;
    -- Set due_date to created_at + 7 days for existing records
    UPDATE payouts SET due_date = created_at + INTERVAL '7 days' WHERE due_date IS NULL;
    ALTER TABLE payouts ALTER COLUMN due_date SET NOT NULL;
  END IF;
END $$;

-- Add failure_reason if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'failure_reason') THEN
    ALTER TABLE payouts ADD COLUMN failure_reason TEXT;
  END IF;
END $$;

-- Add transaction_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'transaction_id') THEN
    ALTER TABLE payouts ADD COLUMN transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payouts' AND column_name = 'updated_at') THEN
    ALTER TABLE payouts ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_due_date ON payouts(due_date);
CREATE INDEX IF NOT EXISTS idx_payouts_created ON payouts(created_at DESC);

-- Platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('general', '{"platform_name": "Reach", "contact_email": "support@reach.com", "support_phone": "+2348000000000", "timezone": "Africa/Lagos", "currency": "NGN"}', 'General platform settings'),
  ('commission', '{"developer_rate": 80, "creator_tier_1": 3.0, "creator_tier_2": 2.5, "creator_tier_3": 2.0, "creator_tier_4": 1.5, "platform_fee": 5}', 'Commission and fee settings'),
  ('verification', '{"email_required": true, "phone_required": true, "document_required": true, "auto_approve_days": 0, "property_review_sla_hours": 48}', 'Verification settings'),
  ('payment', '{"withdrawal_fee": 100, "transaction_fee": 0, "max_transfer_amount": 10000000, "daily_transfer_limit": 5000000, "processing_time_hours": 24}', 'Payment gateway settings'),
  ('notifications', '{"email_enabled": true, "sms_enabled": false, "push_enabled": true}', 'Notification settings'),
  ('security', '{"session_timeout_minutes": 60, "password_min_length": 8, "two_factor_enabled": false, "login_attempt_limit": 5}', 'Security settings')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_actions
-- Only admins can view admin actions
CREATE POLICY "Admins can view all admin actions" ON admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can insert admin actions
CREATE POLICY "Admins can insert admin actions" ON admin_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for disputes
-- Users can view disputes they're involved in
CREATE POLICY "Users can view own disputes" ON disputes
  FOR SELECT
  USING (
    complainant_id = auth.uid() OR
    respondent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can create disputes
CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT
  WITH CHECK (complainant_id = auth.uid());

-- Admins can update disputes
CREATE POLICY "Admins can update disputes" ON disputes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for dispute_messages
-- Users can view messages for disputes they're involved in
CREATE POLICY "Users can view dispute messages" ON dispute_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
      AND (disputes.complainant_id = auth.uid() OR disputes.respondent_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can send messages to disputes they're involved in
CREATE POLICY "Users can send dispute messages" ON dispute_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
      AND (disputes.complainant_id = auth.uid() OR disputes.respondent_id = auth.uid())
    )
  );

-- Admins can always send messages
CREATE POLICY "Admins can send dispute messages" ON dispute_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for payouts
-- Users can view their own payouts
CREATE POLICY "Users can view own payouts" ON payouts
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update payouts
CREATE POLICY "Admins can update payouts" ON payouts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for platform_settings
-- Only admins can view and update settings
CREATE POLICY "Admins can view settings" ON platform_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings" ON platform_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings" ON platform_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
