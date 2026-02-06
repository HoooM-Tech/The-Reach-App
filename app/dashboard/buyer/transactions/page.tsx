'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { buyerApi, BuyerDashboardData, ApiError } from '@/lib/api/client';
import { 
  FileText, 
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Transaction Card Component
// ===========================================

interface TransactionCardProps {
  transaction: any;
  onClick: () => void;
}

function TransactionCard({ transaction, onClick }: TransactionCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      held: { label: 'In Escrow', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
      released: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    };
    return statusConfig[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-700', icon: <FileText size={12} /> };
  };

  const statusInfo = getStatusBadge(transaction.status);
  const isCredit = transaction.amount > 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all text-left"
    >
      <div className="flex items-center justify-between">
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
            <h3 className="font-semibold text-gray-900">
              {transaction.properties?.title || 'Property Transaction'}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <Calendar size={14} />
              <span>
                {new Date(transaction.created_at).toLocaleDateString()} at{' '}
                {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
            {isCredit ? '+' : '-'}{formatAmount(Math.abs(transaction.amount))}
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${statusInfo.color}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>
      </div>
    </button>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function BuyerTransactionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [transactions, setTransactions] = useState<{
    active: any[];
    completed: any[];
  }>({ active: [], completed: [] });
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions from dashboard API
  const fetchTransactions = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const dashboard = await buyerApi.getDashboard(user.id);
      setTransactions({
        active: dashboard.payments?.active_transactions || [],
        completed: dashboard.payments?.completed || [],
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load transactions';
      setError(message);
      console.error('Transactions fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  const displayedTransactions = activeTab === 'active' 
    ? transactions.active 
    : transactions.completed;

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">
          {transactions.active.length} active, {transactions.completed.length} completed
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-[#E54D4D] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Active ({transactions.active.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-[#E54D4D] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Completed ({transactions.completed.length})
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-32" />
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load transactions</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTransactions}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && displayedTransactions.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {activeTab === 'active' ? 'active' : 'completed'} transactions
          </h3>
          <p className="text-gray-500">
            {activeTab === 'active'
              ? 'Your active transactions will appear here'
              : 'Your completed transactions will appear here'}
          </p>
        </div>
      )}

      {/* Transactions List */}
      {!isLoading && !error && displayedTransactions.length > 0 && (
        <div className="space-y-4">
          {displayedTransactions.map((transaction: any) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onClick={() => router.push(`/dashboard/buyer/properties/${transaction.property_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

