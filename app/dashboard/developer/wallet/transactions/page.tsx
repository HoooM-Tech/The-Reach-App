'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { walletApi, WalletData, ApiError } from '@/lib/api/client';
import { ArrowLeft, Bell, ArrowUpRight, ChevronRight, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment';
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch wallet data from real API
  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const [balanceData, transactionsData] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions(),
      ]);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setWalletData({
          wallet: {
            id: (balanceData as any).wallet_id || '',
            user_id: user.id,
            balance: balanceData.availableBalance,
            locked_balance: balanceData.lockedBalance,
          },
          transactions: transactionsData.transactions || [],
        });
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load transactions';
      setError(message);
      console.error('Transactions fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    fetchWalletData();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, userLoading, fetchWalletData, router]);

  const transactions = walletData?.transactions || [];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      completed: { color: 'bg-green-500', icon: <CheckCircle size={12} /> },
      pending: { color: 'bg-orange-500', icon: <Clock size={12} /> },
      failed: { color: 'bg-red-500', icon: <XCircle size={12} /> },
    };
    return statusConfig[status.toLowerCase()] || null;
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#0A1628] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load transactions</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchWalletData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-lg"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      {/* <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          aria-label="Back"
          title="Back"
          onClick={() => router.push('/dashboard/developer/wallet')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Transactions</h1>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header> */}

      {/* Main Content */}
      <div className="px-6 pt-6 pb-8">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
            <p className="text-gray-500">No transaction yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => {
              const isCredit = tx.type === 'credit' || tx.type === 'deposit' || tx.amount > 0;
              const statusInfo = getStatusIcon(tx.status);
              
              return (
                <button
                  key={tx.id}
                  onClick={() => router.push(`/dashboard/developer/wallet/transactions/${tx.id}`)}
                  className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isCredit ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isCredit ? (
                        <ArrowUpRight size={24} className="text-green-600 rotate-[225deg]" />
                      ) : (
                        <ArrowUpRight size={24} className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">{tx.description}</h5>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString()} at{' '}
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : '-'}{formatAmount(Math.abs(tx.amount))}
                      </p>
                    </div>
                    {statusInfo && (
                      <div className={`w-4 h-4 rounded-full ${statusInfo.color} flex items-center justify-center`}>
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


