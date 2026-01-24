'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Bell, Share2 } from 'lucide-react';
import { walletApi } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/client';
import toast from 'react-hot-toast';

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
  reference: string;
  created_at: string;
  bank_accounts?: {
    bank_name: string;
    account_number: string;
    account_name: string;
  };
}

export default function TransactionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransaction();
  }, [transactionId]);

  const fetchTransaction = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const data = await walletApi.getTransaction(transactionId);
      setTransaction(data.transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('Failed to load transaction details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleShare = async () => {
    if (!transaction) return;

    const shareData = {
      title: `Transaction ${transaction.reference}`,
      text: `Transaction Details:\nStatus: ${transaction.status}\nAmount: ${formatAmount(transaction.amount)}\nType: ${transaction.type}\nDate: ${new Date(transaction.created_at).toLocaleDateString()}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.text);
        toast.success('Transaction details copied to clipboard');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareData.text);
        toast.success('Transaction details copied to clipboard');
      }
    }
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

  if (!transaction) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] p-4">
        <div className="max-w-2xl mx-auto text-center py-16">
          <p className="text-gray-600">Transaction not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="bg-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
            aria-label="Go back"
            title="Go back"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Transaction details</h1>
           <button 
             title="Notifications" 
             aria-label="Notifications"
             className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
           >
             <Bell size={20} className="text-gray-600" />
           </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl">
          {/* Transaction Details */}
          <div className="divide-y divide-gray-200">
            <div className="flex justify-between items-center py-5 px-4">
              <span className="text-base text-gray-900">Transaction status</span>
              <span className={`text-base font-semibold ${
                transaction.status === 'successful' ? 'text-green-600' :
                transaction.status === 'pending' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </span>
            </div>

            <div className="flex justify-between items-center py-5 px-4">
              <span className="text-base text-gray-900">Amount</span>
              <span className="text-base font-bold text-gray-900">{formatAmount(transaction.amount)}</span>
            </div>

            <div className="flex justify-between items-center py-5 px-4">
              <span className="text-base text-gray-900">Type</span>
              <span className="text-base font-semibold text-gray-900">
                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
              </span>
            </div>

            <div className="flex justify-between items-center py-5 px-4">
              <span className="text-base text-gray-900">Date</span>
              <span className="text-base font-semibold text-gray-900">
                {new Date(transaction.created_at).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>

            {transaction.category === 'withdrawal' && transaction.bank_accounts && (
              <>
                <div className="flex justify-between items-center py-5 px-4">
                  <span className="text-base text-gray-900">Unit sold</span>
                  <span className="text-base font-semibold text-gray-900">-</span>
                </div>
                <div className="flex justify-between items-center py-5 px-4">
                  <span className="text-base text-gray-900">Estimated commission</span>
                  <span className="text-base font-semibold text-gray-900">-</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center py-5 px-4 border-t-2 border-gray-300">
              <span className="text-lg font-bold text-gray-900">Total amount</span>
              <span className="text-xl font-bold text-gray-900">{formatAmount(transaction.total_amount)}</span>
            </div>
          </div>

          {/* Share Button */}
          <div className="p-4">
            <button
              onClick={handleShare}
              className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 size={20} />
              Share
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
