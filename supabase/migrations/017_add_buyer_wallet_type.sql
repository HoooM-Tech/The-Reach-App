-- Allow buyer user_type in wallets for buyer wallet feature
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_user_type_check;
ALTER TABLE wallets ADD CONSTRAINT wallets_user_type_check
  CHECK (user_type IN ('developer', 'creator', 'buyer'));

-- Allow buyer in withdrawal_limits if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawal_limits') THEN
    ALTER TABLE withdrawal_limits DROP CONSTRAINT IF EXISTS withdrawal_limits_user_type_check;
    ALTER TABLE withdrawal_limits ADD CONSTRAINT withdrawal_limits_user_type_check
      CHECK (user_type IN ('developer', 'creator', 'buyer'));
    INSERT INTO withdrawal_limits (user_type, min_amount, max_amount_per_transaction, max_daily_amount, max_monthly_amount)
    SELECT 'buyer', 100, 5000000, 20000000, 50000000
    WHERE NOT EXISTS (SELECT 1 FROM withdrawal_limits WHERE user_type = 'buyer');
  END IF;
END $$;

-- Transactions category: allow 'payment' for buyer wallet payments
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (category IN ('commission', 'withdrawal', 'deposit', 'refund', 'fee', 'payment'));
