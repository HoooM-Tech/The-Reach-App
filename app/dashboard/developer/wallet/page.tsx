'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { walletApi, WalletData, ApiError } from '@/lib/api/client';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Transaction Item Component
// ===========================================

interface TransactionItemProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    description: string;
    status?: string;
    created_at: string;
  };
  onClick: () => void;
}

function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const isCredit = transaction.type === 'credit' || transaction.type === 'deposit' || transaction.amount > 0;
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      completed: { color: 'text-green-600', icon: <CheckCircle size={12} /> },
      pending: { color: 'text-orange-600', icon: <Clock size={12} /> },
      failed: { color: 'text-red-600', icon: <XCircle size={12} /> },
    };
    return statusConfig[status.toLowerCase()] || null;
  };

  const statusInfo = getStatusBadge(transaction.status);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isCredit ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {isCredit ? (
            <ArrowDownLeft className="text-green-600" size={20} />
          ) : (
            <ArrowUpRight className="text-red-600" size={20} />
          )}
        </div>
        <div>
          <h5 className="font-semibold text-gray-900">{transaction.description}</h5>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-500">
              {new Date(transaction.created_at).toLocaleDateString()} at{' '}
              {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {statusInfo && (
              <span className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                {statusInfo.icon}
                {transaction.status}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
            {isCredit ? '+' : '-'}{formatAmount(transaction.amount)}
          </p>
        </div>
        <ChevronRight className="text-gray-400" size={18} />
      </div>
    </button>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperWalletPage() {
  const router = useRouter();
  const { user } = useUser();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch wallet data from real API
  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [balanceData, transactionsData] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions({ limit: 5 }),
      ]);
      
      setWalletData({
        wallet: {
          balance: balanceData.availableBalance,
          locked_balance: balanceData.lockedBalance,
        },
        transactions: transactionsData.transactions || [],
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load wallet';
      setError(message);
      console.error('Wallet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWalletData();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchWalletData]);

  // Format currency
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load wallet</h3>
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

  const availableBalance = walletData?.wallet?.balance || 0;
  const lockedBalance = walletData?.wallet?.locked_balance || 0;
  const transactions = walletData?.transactions || [];

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your funds and transactions</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#0A1628] to-[#1a2d4a] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/80 text-sm">Available Balance</p>
          <button 
            onClick={() => setShowBalance(!showBalance)}
            className="text-white/60 hover:text-white"
          >
            {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        
        <h2 className="text-3xl font-bold mb-4">
          {showBalance ? formatAmount(availableBalance) : '₦ ****'}
        </h2>
        
        {lockedBalance > 0 && (
          <div className="mb-6 pt-4 border-t border-white/10">
            <p className="text-white/60 text-sm mb-1">Locked Balance</p>
            <p className="text-lg font-semibold">{formatAmount(lockedBalance)}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard/developer/wallet/withdraw')}
            disabled={availableBalance <= 0}
            className="flex-1 bg-white text-[#0A1628] font-semibold py-3 rounded-xl hover:bg-white/90 disabled:opacity-50 transition-colors"
          >
            Withdraw
          </button>
          <button
            onClick={() => router.push('/dashboard/developer/wallet/add-funds')}
            className="flex-1 bg-white/10 border-2 border-white/20 text-white font-semibold py-3 rounded-xl hover:bg-white/20 transition-colors"
          >
            +Add Funds
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
          <button 
            onClick={() => router.push('/dashboard/developer/wallet/transactions')}
            className="text-sm text-[#0A1628] font-semibold hover:underline"
          >
            View all
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions yet</p>
            <p className="text-sm text-gray-400 mt-1">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction: any) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onClick={() => router.push(`/dashboard/developer/wallet/transactions/${transaction.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

