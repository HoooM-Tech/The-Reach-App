-- Enforce payment types: property_purchase, wallet_topup, withdrawal only (for new flows).
-- Keep existing categories for backward compatibility; add new ones.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (category IN (
    'commission', 'withdrawal', 'deposit', 'refund', 'fee', 'payment',
    'property_purchase', 'wallet_topup'
  ));

COMMENT ON COLUMN transactions.category IS 'payment_type: property_purchase (property buy), wallet_topup (add funds), withdrawal. Legacy: deposit, payment, etc.';
