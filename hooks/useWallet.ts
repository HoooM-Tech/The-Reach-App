import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import toast from 'react-hot-toast';

export interface WalletBalance {
  availableBalance: number;
  lockedBalance: number;
  currency: string;
  isSetup: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit' | 'deposit' | 'withdrawal';
  category: string;
  amount: number;
  fee: number;
  total_amount: number;
  title: string;
  description?: string;
  status: 'pending' | 'successful' | 'failed' | 'completed';
  created_at: string;
}

export function useWallet() {
  const router = useRouter();
  const { user } = useUser();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      // API route reads from cookies via getAuthenticatedUser()
      // No need to send Authorization header - cookies are included automatically
      const response = await fetch('/api/wallet/balance', {
        credentials: 'include', // CRITICAL: Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const responseData = await response.json();
      const walletData = responseData.data || responseData;
      const balanceData: WalletBalance = {
        availableBalance: walletData.available_balance || walletData.availableBalance || 0,
        lockedBalance: walletData.locked_balance || walletData.lockedBalance || 0,
        currency: walletData.currency || 'NGN',
        isSetup: walletData.is_setup !== undefined ? walletData.is_setup : walletData.isSetup || false,
      };
      setBalance(balanceData);
      return balanceData;
    } catch (error) {
      console.error('Error fetching balance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet balance';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  }, [router]);

  const fetchTransactions = useCallback(async (limit: number = 10) => {
    try {
      // SECURITY: API route reads from cookies via getAuthenticatedUser()
      // No need to send Authorization header - cookies are included automatically
      // This is more secure than reading session.access_token from getSession()
      const response = await fetch(`/api/wallet/transactions?limit=${limit}`, {
        credentials: 'include', // CRITICAL: Include cookies for authentication
      });

      if (!response.ok) {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch transactions' }));
        console.error('Transactions API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        setError(errorData.error || `Failed to load transactions (${response.status})`);
        setTransactions([]);
        return [];
      }

      const data = await response.json();
      console.log('[useWallet] Transactions API response:', {
        hasData: !!data.data,
        hasTransactions: !!data.data?.transactions,
        transactionCount: data.data?.transactions?.length || 0,
        responseStructure: Object.keys(data),
      });

      // API returns: { success: true, data: { transactions: [...] } }
      const transactions = data.data?.transactions || data.transactions || [];
      
      if (transactions.length === 0) {
        console.log('[useWallet] No transactions found. Wallet ID might be missing or transactions not linked.');
      }
      
      setTransactions(transactions);
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load transactions';
      setError(errorMessage);
      setTransactions([]);
      return [];
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchBalance(), fetchTransactions()]);
    } catch (error) {
      // Error already handled in fetchBalance/fetchTransactions
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchBalance, fetchTransactions]);

  useEffect(() => {
    if (user?.id) {
      refreshWallet();
    }
  }, [user?.id, refreshWallet]);

  return {
    balance,
    transactions,
    isLoading,
    error,
    refreshWallet,
    fetchBalance,
    fetchTransactions,
  };
}
