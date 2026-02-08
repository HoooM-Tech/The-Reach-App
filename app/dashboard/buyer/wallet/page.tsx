'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { X, ChevronRight, Eye, EyeOff, ArrowUpRight, Bell, SlidersHorizontal, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface WalletData {
  availableBalance: number;
  lockedBalance: number;
  currency: string;
  isSetup: boolean;
  walletId: string;
}

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  title: string;
  description: string;
  created_at: string;
}

export default function BuyerWalletPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    try {
      setError(null);
      const [balanceRes, txRes] = await Promise.all([
        fetch('/api/buyer/wallet/balance', { credentials: 'include' }),
        fetch('/api/buyer/wallet/transactions?limit=4', { credentials: 'include' }),
      ]);

      if (!balanceRes.ok) throw new Error('Failed to fetch wallet');

      const balanceJson = await balanceRes.json();
      const balData = balanceJson.data || balanceJson;

      setWalletData({
        availableBalance: parseFloat(balData.available_balance || balData.availableBalance || 0),
        lockedBalance: parseFloat(balData.locked_balance || balData.lockedBalance || 0),
        currency: balData.currency || 'NGN',
        isSetup: balData.is_setup || balData.isSetup || false,
        walletId: balData.wallet_id || '',
      });

      if (txRes.ok) {
        const txJson = await txRes.json();
        const txList = txJson.data?.transactions || txJson.transactions || [];
        setTransactions(txList);
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchWalletData();
    }
  }, [user, userLoading, router, fetchWalletData]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${month} ${day}${suffix}, ${hours}:${minutes}:${seconds}`;
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB]">
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load wallet</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => { setIsLoading(true); fetchWalletData(); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A3B5D] text-white rounded-xl font-medium"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (walletData && !walletData.isSetup) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <div className="w-28 h-28 sm:w-32 sm:h-32 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
            <X className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Setup up your wallet</h1>
          <button
            onClick={() => router.push('/dashboard/buyer/wallet/setup-pin')}
            className="w-full bg-gray-50 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex-1 mr-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Setup your wallet</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Enjoy all functionality from your wallet feature by completing your wallet setup
              </p>
            </div>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 flex-shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 sm:px-6 py-5 sm:py-6 flex items-center justify-between max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Wallet</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            aria-label="Notifications"
            title="Notifications"
            onClick={() => router.push('/dashboard/notifications')}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Bell size={20} className="text-gray-700" />
          </button>
          <button
            aria-label="Settings"
            title="Settings"
            onClick={() => router.push('/dashboard/buyer/settings')}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={20} className="text-gray-700" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-8 space-y-6">
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
          <div className="mb-4">
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              {showBalance ? 'Available Balance' : 'Balance'}
            </p>
            <div className="flex items-center gap-3">
              <p className="text-3xl sm:text-4xl font-bold text-gray-900">
                {showBalance
                  ? formatAmount(walletData?.availableBalance || 0)
                  : '₦ ****'}
              </p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="w-8 h-8 flex items-center justify-center"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                title={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? (
                  <Eye size={22} className="text-gray-500" />
                ) : (
                  <EyeOff size={22} className="text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {showBalance && (
            <div className="mb-6">
              <p className="text-sm text-gray-600">Locked Balance</p>
              <p className="text-base font-semibold text-gray-900">
                {formatAmount(walletData?.lockedBalance || 0)}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/buyer/wallet/withdraw')}
              className="flex-1 py-3.5 bg-[#1A3B5D] text-white rounded-full font-medium hover:bg-[#1A3B5D]/90 transition-colors"
            >
              Withdraw
            </button>
            <button
              onClick={() => router.push('/dashboard/buyer/wallet/add-funds')}
              className="flex-1 py-3.5 text-gray-700 font-medium flex items-center justify-center gap-1 hover:bg-gray-50 rounded-full transition-colors"
            >
              <span className="text-lg">+</span>Add funds
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent transactions</h2>
            {transactions.length > 0 && (
              <button
                onClick={() => router.push('/dashboard/buyer/wallet/transactions')}
                className="text-sm text-[#1A3B5D] underline"
              >
                View all
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 sm:p-16 text-center shadow-sm">
              <p className="text-gray-400">No transaction yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isCredit = tx.type === 'credit' || tx.type === 'deposit' || tx.amount > 0;
                return (
                  <button
                    key={tx.id}
                    onClick={() => router.push(`/dashboard/buyer/wallet/transactions/${tx.id}`)}
                    className="w-full bg-white rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-orange-50' : 'bg-gray-100'}`}>
                        <ArrowUpRight
                          size={18}
                          className={isCredit ? 'text-orange-500' : 'text-gray-600'}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm sm:text-base">{tx.title || tx.description || 'Transaction'}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <p className="font-semibold text-sm sm:text-base text-gray-900">
                        {isCredit ? '+' : '-'}{formatAmount(Math.abs(tx.amount)).replace('NGN', '').trim()}
                      </p>
                      {(tx.status === 'successful' || tx.status === 'completed') ? (
                        <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="63" strokeDashoffset="0" strokeLinecap="round" />
                        </svg>
                      ) : (tx.status === 'processing' || tx.status === 'pending') ? (
                        <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="63" strokeDashoffset="20" strokeLinecap="round" />
                        </svg>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
