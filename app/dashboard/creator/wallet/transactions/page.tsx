'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, ArrowRight } from 'lucide-react';
import { walletApi } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  title: string;
  description?: string;
  status: 'pending' | 'successful' | 'failed';
  created_at: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const data = await walletApi.getTransactions({ limit: 50 });
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

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
    const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
    return `${month} ${day}${suffix}, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] p-4">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/*
          <button
            title="Back"
            aria-label="Go back"
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          */}
          <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
          {/*
          <button aria-label="Notifications" title="Notifications" className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <Bell size={20} className="text-gray-600" />
          </button>
          */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
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
      </main>
    </div>
  );
}
