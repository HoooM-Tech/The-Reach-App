'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ArrowUpRight, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

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

export default function BuyerTransactionsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/buyer/wallet/transactions?limit=50', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      const list = data.data?.transactions || data.transactions || [];
      setTransactions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (user) fetchTransactions();
  }, [user, userLoading, router, fetchTransactions]);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(Math.abs(amount));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load transactions</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => { setIsLoading(true); fetchTransactions(); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A3B5D] text-white rounded-xl font-medium"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#F5F0EB]">
        <button aria-label="Back" title="Back" onClick={() => router.push('/dashboard/buyer/wallet')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">All Transactions</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <main className="px-4 sm:px-6 pb-8 max-w-2xl mx-auto">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
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
                  className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-orange-50' : 'bg-gray-100'}`}>
                      <ArrowUpRight size={18} className={isCredit ? 'text-orange-500' : 'text-gray-600'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{tx.title || tx.description || 'Transaction'}</p>
                      <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <p className={`font-semibold text-sm ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                      {isCredit ? '+' : '-'}{formatAmount(tx.amount).replace('NGN', '').trim()}
                    </p>
                    <span className={`text-xs capitalize ${tx.status === 'successful' || tx.status === 'completed' ? 'text-green-500' : tx.status === 'failed' ? 'text-red-500' : 'text-orange-500'}`}>
                      {tx.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
