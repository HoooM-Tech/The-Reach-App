import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { WalletErrorCode, createWalletError } from './wallet-errors';
import { formatNaira } from './currency';

export interface WithdrawalLimits {
  min_amount: number;
  max_amount_per_transaction: number;
  max_daily_amount: number;
  max_monthly_amount: number | null;
}

/**
 * Get withdrawal limits for a user type
 */
export async function getWithdrawalLimits(
  userType: 'developer' | 'creator' | 'buyer'
): Promise<WithdrawalLimits> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('withdrawal_limits')
    .select('*')
    .eq('user_type', userType)
    .single();

  if (error || !data) {
    // Return defaults if not found
    return {
      min_amount: 1000,
      max_amount_per_transaction: 5000000,
      max_daily_amount: 10000000,
      max_monthly_amount: 50000000,
    };
  }

  return {
    min_amount: parseFloat(data.min_amount || 1000),
    max_amount_per_transaction: parseFloat(data.max_amount_per_transaction || 5000000),
    max_daily_amount: parseFloat(data.max_daily_amount || 10000000),
    max_monthly_amount: data.max_monthly_amount ? parseFloat(data.max_monthly_amount) : null,
  };
}

/**
 * Check daily withdrawal limit
 */
export async function checkDailyWithdrawalLimit(
  userId: string,
  amount: number
): Promise<void> {
  const supabase = createAdminSupabaseClient();

  // Get user type
  const { data: wallet } = await supabase
    .from('wallets')
    .select('user_type')
    .eq('user_id', userId)
    .single();

  if (!wallet) {
    throw createWalletError(
      WalletErrorCode.WALLET_NOT_FOUND,
      'Wallet not found'
    );
  }

  const limits = await getWithdrawalLimits(wallet.user_type);

  // Get today's withdrawals
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayWithdrawals, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'debit')
    .eq('category', 'withdrawal')
    .in('status', ['pending', 'processing', 'completed', 'successful'])
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('Error checking daily limit:', error);
    return; // Don't block if query fails
  }

  const dailyTotal = todayWithdrawals?.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  ) || 0;

  if (dailyTotal + amount > limits.max_daily_amount) {
    throw createWalletError(
      WalletErrorCode.DAILY_LIMIT_EXCEEDED,
      `Daily withdrawal limit exceeded. Maximum: ${formatNaira(limits.max_daily_amount)}`,
      {
        dailyTotal,
        requested: amount,
        limit: limits.max_daily_amount,
      }
    );
  }
}

/**
 * Check monthly withdrawal limit
 */
export async function checkMonthlyWithdrawalLimit(
  userId: string,
  amount: number
): Promise<void> {
  const supabase = createAdminSupabaseClient();

  // Get user type
  const { data: wallet } = await supabase
    .from('wallets')
    .select('user_type')
    .eq('user_id', userId)
    .single();

  if (!wallet) {
    throw createWalletError(
      WalletErrorCode.WALLET_NOT_FOUND,
      'Wallet not found'
    );
  }

  const limits = await getWithdrawalLimits(wallet.user_type);

  if (!limits.max_monthly_amount) {
    return; // No monthly limit
  }

  // Get this month's withdrawals
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const { data: monthWithdrawals, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'debit')
    .eq('category', 'withdrawal')
    .in('status', ['pending', 'processing', 'completed', 'successful'])
    .gte('created_at', firstDayOfMonth.toISOString());

  if (error) {
    console.error('Error checking monthly limit:', error);
    return; // Don't block if query fails
  }

  const monthlyTotal = monthWithdrawals?.reduce(
    (sum, t) => sum + parseFloat(t.amount || 0),
    0
  ) || 0;

  if (monthlyTotal + amount > limits.max_monthly_amount) {
    throw createWalletError(
      WalletErrorCode.MONTHLY_LIMIT_EXCEEDED,
      `Monthly withdrawal limit exceeded. Maximum: ${formatNaira(limits.max_monthly_amount)}`,
      {
        monthlyTotal,
        requested: amount,
        limit: limits.max_monthly_amount,
      }
    );
  }
}

/**
 * Check all withdrawal limits
 */
export async function checkWithdrawalLimits(
  userId: string,
  amount: number
): Promise<void> {
  await checkDailyWithdrawalLimit(userId, amount);
  await checkMonthlyWithdrawalLimit(userId, amount);
}
