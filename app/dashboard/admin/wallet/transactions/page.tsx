'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

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

export default function AdminTransactionsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter !== 'all') params.set('type', filter);
      const res = await fetch(`/api/wallet/transactions?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data?.transactions || data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (user) fetchTransactions();
  }, [user, userLoading, router, fetchTransactions]);

  const formatAmount = (val: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(Math.abs(val));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month} ${day}${suffix}, ${hours}:${minutes}`;
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce<Record<string, Transaction[]>>((groups, tx) => {
    const date = new Date(tx.created_at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
    return groups;
  }, {});

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA]">
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between bg-transparent">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        </header>
        <div className="px-4 sm:px-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#FDFBFA]">
        <button aria-label="Back" title="Back" onClick={() => router.push('/dashboard/admin/wallet')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">All Transactions</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="px-4 sm:px-6 mb-4">
        <div className="flex gap-2">
          {(['all', 'credit', 'debit'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setIsLoading(true); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              {f === 'all' ? 'All' : f === 'credit' ? 'Credits' : 'Debits'}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 sm:px-6 pb-8 max-w-2xl mx-auto">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Filter size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([dateGroup, txs]) => (
              <div key={dateGroup}>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">{dateGroup}</h3>
                <div className="space-y-2">
                  {txs.map((tx) => {
                    const isCredit = tx.type === 'credit' || tx.type === 'deposit' || tx.amount > 0;
                    return (
                      <button
                        key={tx.id}
                        onClick={() => router.push(`/dashboard/admin/wallet/transactions/${tx.id}`)}
                        className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-green-50' : 'bg-orange-50'}`}>
                            {isCredit ? (
                              <ArrowDownRight size={18} className="text-green-500" />
                            ) : (
                              <ArrowUpRight size={18} className="text-orange-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{tx.title || tx.description || 'Transaction'}</p>
                            <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <p className={`font-semibold text-sm ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                            {isCredit ? '+' : '-'}{formatAmount(tx.amount).replace('NGN', '').trim()}
                          </p>
                          <p className={`text-xs capitalize ${tx.status === 'successful' || tx.status === 'completed' ? 'text-green-500' : tx.status === 'failed' ? 'text-red-500' : 'text-orange-500'}`}>
                            {tx.status}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
