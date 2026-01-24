-- Create wallet system tables
-- Wallets, Bank Accounts, and Transactions

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;

-- Wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL,
  
  -- Balances
  available_balance DECIMAL(15,2) DEFAULT 0 NOT NULL,
  locked_balance DECIMAL(15,2) DEFAULT 0 NOT NULL,
  
  -- PIN (hashed with bcrypt)
  pin_hash TEXT,
  pin_attempts INTEGER DEFAULT 0,
  pin_locked_until TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_setup BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT wallets_user_type_check CHECK (user_type IN ('developer', 'creator'))
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_type ON wallets(user_type);
CREATE INDEX IF NOT EXISTS idx_wallets_is_setup ON wallets(is_setup);

-- Bank accounts table
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  
  -- Bank Details
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  
  -- Paystack
  recipient_code VARCHAR(255),
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(wallet_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_wallet_id ON bank_accounts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_primary ON bank_accounts(is_primary);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  
  -- Transaction Details
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  fee DECIMAL(15,2) DEFAULT 0 NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  
  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reference VARCHAR(255) UNIQUE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Related entities
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  promotion_id UUID REFERENCES tracking_links(id) ON DELETE SET NULL,
  
  -- Paystack
  paystack_reference VARCHAR(255),
  paystack_status VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT transactions_type_check CHECK (type IN ('credit', 'debit')),
  CONSTRAINT transactions_category_check CHECK (category IN ('commission', 'withdrawal', 'deposit', 'refund', 'fee')),
  CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'successful', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account_id ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_property_id ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_promotion_id ON transactions(promotion_id);

-- Create trigger to update updated_at timestamp for wallets
CREATE OR REPLACE FUNCTION update_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallets_updated_at();

-- Create trigger to update updated_at timestamp for bank_accounts
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER bank_accounts_updated_at
BEFORE UPDATE ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Create trigger to update updated_at timestamp for transactions
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_transactions_updated_at();

-- Add comments
COMMENT ON TABLE wallets IS 'User wallets for creators and developers';
COMMENT ON TABLE bank_accounts IS 'Bank accounts linked to wallets for withdrawals';
COMMENT ON TABLE transactions IS 'All wallet transactions (credits, debits, withdrawals, deposits)';
COMMENT ON COLUMN wallets.pin_hash IS 'Bcrypt hashed PIN (never store plain PIN)';
COMMENT ON COLUMN wallets.pin_locked_until IS 'Timestamp when PIN is locked after failed attempts';
COMMENT ON COLUMN bank_accounts.recipient_code IS 'Paystack transfer recipient code';
COMMENT ON COLUMN transactions.reference IS 'Unique transaction reference for tracking';
COMMENT ON COLUMN transactions.paystack_reference IS 'Paystack transaction/transfer reference';
