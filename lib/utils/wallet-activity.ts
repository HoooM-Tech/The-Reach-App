import { createAdminSupabaseClient } from '@/lib/supabase/server';

export interface WalletActivityLog {
  wallet_id: string;
  user_id: string;
  action: string;
  previous_balance: number;
  new_balance: number;
  amount_changed: number;
  transaction_id?: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log wallet activity for audit trail
 */
export async function logWalletActivity(
  data: WalletActivityLog
): Promise<void> {
  try {
    const supabase = createAdminSupabaseClient();
    await supabase.from('wallet_activity_logs').insert({
      wallet_id: data.wallet_id,
      user_id: data.user_id,
      action: data.action,
      previous_balance: data.previous_balance,
      new_balance: data.new_balance,
      amount_changed: data.amount_changed,
      transaction_id: data.transaction_id,
      description: data.description,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
    });
  } catch (error) {
    // Don't throw - logging should not break the main flow
    console.error('Failed to log wallet activity:', error);
  }
}

/**
 * Get wallet activity logs
 */
export async function getWalletActivityLogs(
  walletId: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('wallet_activity_logs')
    .select('*')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching wallet activity logs:', error);
    return [];
  }

  return data || [];
}
