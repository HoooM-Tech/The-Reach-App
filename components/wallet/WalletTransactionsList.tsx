'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { WalletTransaction } from '@/hooks/useWallet';

interface WalletTransactionsListProps {
  transactions: WalletTransaction[];
  viewAllPath: string;
  role: 'creator' | 'developer';
}

export function WalletTransactionsList({
  transactions,
  viewAllPath,
  role,
}: WalletTransactionsListProps) {
  const router = useRouter();

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

  const getTransactionType = (transaction: WalletTransaction): 'credit' | 'debit' => {
    if (transaction.type === 'credit' || transaction.type === 'deposit' || transaction.amount > 0) {
      return 'credit';
    }
    return 'debit';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">Recent transactions</h2>
        <button
          onClick={() => router.push(viewAllPath)}
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
          {transactions.map((transaction) => {
            const type = getTransactionType(transaction);
            return (
              <div
                key={transaction.id}
                onClick={() => router.push(`${viewAllPath}/${transaction.id}`)}
                className="bg-white rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    type === 'credit' ? 'bg-orange-100' : 'bg-gray-100'
                  }`}>
                    <ArrowRight
                      size={18}
                      className={type === 'credit' ? 'text-orange-600' : 'text-gray-600'}
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
                    type === 'credit' ? 'text-gray-900' : 'text-gray-900'
                  }`}>
                    {type === 'credit' ? '+' : '-'}{formatAmount(Math.abs(transaction.amount))}
                  </p>
                  {transaction.status === 'successful' || transaction.status === 'completed' ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  ) : transaction.status === 'pending' ? (
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
