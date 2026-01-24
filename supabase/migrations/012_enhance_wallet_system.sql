-- Enhance wallet system with comprehensive fields
-- This migration adds missing fields from the comprehensive spec

-- Add missing fields to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'NGN',
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50) DEFAULT 'paystack',
ADD COLUMN IF NOT EXISTS gateway_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS authorization_url TEXT,
ADD COLUMN IF NOT EXISTS access_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS transfer_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS webhook_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_payload JSONB,
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;

-- Set payment_gateway for existing records
UPDATE transactions
SET payment_gateway = 'paystack'
WHERE payment_gateway IS NULL;

-- Map paystack_reference to gateway_reference for existing records
UPDATE transactions
SET gateway_reference = paystack_reference
WHERE gateway_reference IS NULL AND paystack_reference IS NOT NULL;

-- Update transactions status enum to include more statuses
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE transactions
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'successful', 'failed', 'cancelled', 'reversed'));

-- Update transactions type enum
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'reversal', 'refund', 'credit', 'debit'));

-- Add missing fields to wallets table
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'NGN';

-- Update wallets: balance should be available_balance + locked_balance
-- Create a function to keep balance in sync
CREATE OR REPLACE FUNCTION sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance = COALESCE(NEW.available_balance, 0) + COALESCE(NEW.locked_balance, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_sync_balance ON wallets;
CREATE TRIGGER wallets_sync_balance
BEFORE INSERT OR UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION sync_wallet_balance();

-- Add missing fields to bank_accounts table
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create wallet_activity_logs table
CREATE TABLE IF NOT EXISTS wallet_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  previous_balance DECIMAL(15,2),
  new_balance DECIMAL(15,2),
  amount_changed DECIMAL(15,2),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_activity_logs_wallet_id ON wallet_activity_logs(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_logs_user_id ON wallet_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_logs_created_at ON wallet_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_logs_transaction_id ON wallet_activity_logs(transaction_id);

-- Create withdrawal_limits table
CREATE TABLE IF NOT EXISTS withdrawal_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_type VARCHAR(20) NOT NULL,
  min_amount DECIMAL(15,2) NOT NULL DEFAULT 1000,
  max_amount_per_transaction DECIMAL(15,2) DEFAULT 5000000,
  max_daily_amount DECIMAL(15,2) DEFAULT 10000000,
  max_monthly_amount DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT withdrawal_limits_user_type_check CHECK (user_type IN ('developer', 'creator'))
);

-- Insert default withdrawal limits (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM withdrawal_limits) THEN
    INSERT INTO withdrawal_limits (user_type, min_amount, max_amount_per_transaction, max_daily_amount, max_monthly_amount)
    VALUES 
      ('developer', 1000, 5000000, 10000000, 50000000),
      ('creator', 1000, 5000000, 10000000, 50000000);
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_gateway_reference ON transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_initiated_at ON transactions(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);

-- Update existing transactions to set user_id from wallet
UPDATE transactions t
SET user_id = w.user_id
FROM wallets w
WHERE t.wallet_id = w.id AND t.user_id IS NULL;

-- Update existing bank_accounts to set user_id from wallet
UPDATE bank_accounts ba
SET user_id = w.user_id
FROM wallets w
WHERE ba.wallet_id = w.id AND ba.user_id IS NULL;

-- Add comments
COMMENT ON TABLE wallet_activity_logs IS 'Audit trail for all wallet balance changes';
COMMENT ON TABLE withdrawal_limits IS 'Withdrawal limits per user type';
COMMENT ON COLUMN transactions.net_amount IS 'Amount after fees';
COMMENT ON COLUMN transactions.authorization_url IS 'Paystack payment authorization URL';
COMMENT ON COLUMN transactions.access_code IS 'Paystack access code';
COMMENT ON COLUMN transactions.transfer_code IS 'Paystack transfer code';
COMMENT ON COLUMN transactions.metadata IS 'Additional transaction metadata';
COMMENT ON COLUMN transactions.webhook_received IS 'Whether webhook was received for this transaction';
