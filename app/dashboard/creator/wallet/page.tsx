'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { getAccessToken } from '@/lib/api/client';
import { Eye, EyeOff, ArrowRight, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface WalletBalance {
  availableBalance: number;
  lockedBalance: number;
  currency: string;
  isSetup: boolean;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  fee: number;
  total_amount: number;
  title: string;
  description?: string;
  status: 'pending' | 'successful' | 'failed';
  created_at: string;
}

export default function CreatorWalletPage() {
  const router = useRouter();
  const { user } = useUser();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const responseData = await response.json();
      // Handle both response formats: { success: true, data: {...} } or direct data
      const walletData = responseData.data || responseData;
      const balanceData: WalletBalance = {
        availableBalance: walletData.available_balance || walletData.availableBalance || 0,
        lockedBalance: walletData.locked_balance || walletData.lockedBalance || 0,
        currency: walletData.currency || 'NGN',
        isSetup: walletData.is_setup !== undefined ? walletData.is_setup : walletData.isSetup || false,
      };
      setBalance(balanceData);

      if (!balanceData.isSetup) {
        setShowSetupModal(true);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Failed to load wallet balance');
    }
  }, [router]);

  const fetchTransactions = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch('/api/wallet/transactions?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      Promise.all([fetchBalance(), fetchTransactions()]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [user?.id, fetchBalance, fetchTransactions]);

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
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${month} ${day}${day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] p-4">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <p className="text-base text-gray-700 mb-2">Available Balance</p>
            <div className="flex items-center gap-3">
              <p className="text-4xl font-bold text-gray-900">
                {showBalance ? formatAmount(balance?.availableBalance || 0) : '₦ ****'}
              </p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="w-6 h-6 flex items-center justify-center"
              >
                {showBalance ? (
                  <Eye size={24} className="text-gray-600" />
                ) : (
                  <EyeOff size={24} className="text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-base text-gray-700 mb-2">Locked Balance</p>
            <p className="text-xl font-semibold text-gray-900">
              {showBalance ? formatAmount(balance?.lockedBalance || 0) : '₦****'}
            </p>
          </div>

          <button
            onClick={() => {
            if (balance?.isSetup) {
              router.push('/dashboard/creator/wallet/withdraw');
            } else {
              setShowSetupModal(true);
            }
          }}
            className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors"
          >
            Withdraw
          </button>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Recent transactions</h2>
            <button
              onClick={() => router.push('/dashboard/creator/wallet/transactions')}
              className="text-base text-[#1E3A5F] underline"
            >
              View all
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center">
              <p className="text-base text-gray-500">No transaction yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  onClick={() => router.push(`/dashboard/creator/wallet/transactions/${transaction.id}`)}
                  className="bg-white rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'credit' ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <ArrowRight
                        size={18}
                        className={transaction.type === 'credit' ? 'text-orange-600' : 'text-gray-600'}
                        style={{ transform: 'rotate(45deg)' }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{transaction.title || 'Transaction'}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${
                      transaction.type === 'credit' ? 'text-gray-900' : 'text-gray-900'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatAmount(Math.abs(transaction.amount))}
                    </p>
                    {transaction.status === 'successful' && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                    {transaction.status === 'pending' && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Setup Prompt Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-6" />
            
            <div className="px-6 pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">✕</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup up your wallet</h2>

              <div
                onClick={() => {
                  setShowSetupModal(false);
                  router.push('/dashboard/creator/wallet/setup');
                }}
                className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Setup your wallet</p>
                  <p className="text-sm text-gray-600">
                    Enjoy all functionality from your wallet feature by completing your wallet setup
                  </p>
                </div>
                <ChevronRight size={20} className="text-orange-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
