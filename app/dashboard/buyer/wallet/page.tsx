'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';

// ===========================================
// Types
// ===========================================

interface WalletBalance {
  balance: number;
  locked_balance: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'commission';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description?: string;
  created_at: string;
}

// ===========================================
// Balance Card Component
// ===========================================

function BalanceCard({ balance, lockedBalance }: { balance: number; lockedBalance: number }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-reach-primary rounded-2xl p-6 text-white">
      <p className="text-white/70 text-sm mb-1">Available Balance</p>
      <p className="text-3xl font-bold mb-4">{formatCurrency(balance)}</p>
      
      {lockedBalance > 0 && (
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Clock size={14} />
          <span>{formatCurrency(lockedBalance)} in escrow</span>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Transaction Item Component
// ===========================================

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'deposit':
        return { icon: ArrowDownLeft, color: 'text-green-500', bgColor: 'bg-green-100' };
      case 'withdrawal':
        return { icon: ArrowUpRight, color: 'text-red-500', bgColor: 'bg-red-100' };
      case 'payment':
        return { icon: ArrowUpRight, color: 'text-orange-500', bgColor: 'bg-orange-100' };
      case 'refund':
        return { icon: ArrowDownLeft, color: 'text-blue-500', bgColor: 'bg-blue-100' };
      case 'commission':
        return { icon: ArrowDownLeft, color: 'text-purple-500', bgColor: 'bg-purple-100' };
      default:
        return { icon: Wallet, color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'failed':
        return <XCircle size={14} className="text-red-500" />;
      case 'pending':
      case 'processing':
        return <Clock size={14} className="text-orange-500" />;
      default:
        return null;
    }
  };

  const typeConfig = getTypeConfig(transaction.type);
  const Icon = typeConfig.icon;
  const isCredit = ['deposit', 'refund', 'commission'].includes(transaction.type);

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeConfig.bgColor}`}>
        <Icon size={18} className={typeConfig.color} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
          {getStatusIcon(transaction.status)}
        </div>
        <p className="text-sm text-gray-500 truncate">
          {transaction.description || formatDate(transaction.created_at)}
        </p>
      </div>
      
      <p className={`font-semibold ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
      </p>
    </div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function WalletSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-gray-200 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Main Wallet Page
// ===========================================

export default function BuyerWalletPage() {
  const router = useRouter();
  const { user } = useUser();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch balance
      const balanceResponse = await fetch('/api/wallet/balance', {
        credentials: 'include',
      });
      
      if (!balanceResponse.ok) {
        throw new Error('Failed to fetch wallet balance');
      }
      
      const balanceData = await balanceResponse.json();
      setBalance({
        balance: balanceData.balance || 0,
        locked_balance: balanceData.locked_balance || 0,
      });

      // Fetch transactions
      const transactionsResponse = await fetch('/api/wallet/transactions?limit=10', {
        credentials: 'include',
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallet');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-reach-light p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <WalletSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-reach-light p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load wallet</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchWalletData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg hover:bg-[#d43d3d]"
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
    <div className="min-h-screen bg-reach-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your funds and transactions</p>
        </div>

        {/* Balance Card */}
        {balance && (
          <BalanceCard 
            balance={balance.balance} 
            lockedBalance={balance.locked_balance} 
          />
        )}

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Transactions</h2>
            {transactions.length > 0 && (
              <button
                onClick={() => router.push('/dashboard/buyer/transactions')}
                className="text-sm text-[#E54D4D] font-medium"
              >
                View All
              </button>
            )}
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-10 sm:py-12 bg-white rounded-2xl">
              <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-500 text-sm sm:text-base">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
