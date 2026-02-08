'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ArrowUpRight, ArrowDownRight, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface TransactionDetail {
  id: string;
  type: string;
  category: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  title: string;
  description: string;
  reference: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  created_at: string;
  completed_at: string;
}

export default function AdminTransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params?.id as string;
  const { user, isLoading: userLoading } = useUser();

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const fetchTransaction = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/wallet/transactions/${transactionId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load transaction');
      const data = await res.json();
      setTransaction(data.data?.transaction || data.transaction || data.data || data);
    } catch (err) {
      console.error('Failed to fetch transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transaction');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (user && transactionId) fetchTransaction();
  }, [user, userLoading, router, transactionId, fetchTransaction]);

  const formatAmount = (val: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(Math.abs(val));

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyReference = () => {
    if (transaction?.reference) {
      navigator.clipboard.writeText(transaction.reference);
      setCopiedRef(true);
      toast.success('Reference copied!');
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful':
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'processing':
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA]">
        <header className="px-4 sm:px-6 py-4 flex items-center justify-between bg-transparent">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        </header>
        <main className="px-4 sm:px-6 pt-6 max-w-lg mx-auto">
          <div className="bg-white rounded-3xl p-6 animate-pulse">
            <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="h-8 w-40 bg-gray-200 rounded mx-auto mb-8" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => { setIsLoading(true); fetchTransaction(); }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-xl font-medium"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!transaction) return null;

  const isCredit = transaction.type === 'credit' || transaction.type === 'deposit' || transaction.amount > 0;

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#FDFBFA]">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Transaction Details</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <main className="px-4 sm:px-6 pt-6 pb-8 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Icon & Amount */}
          <div className="text-center mb-8">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isCredit ? 'bg-green-50' : 'bg-orange-50'}`}>
              {isCredit ? (
                <ArrowDownRight size={24} className="text-green-500" />
              ) : (
                <ArrowUpRight size={24} className="text-orange-500" />
              )}
            </div>
            <p className={`text-3xl sm:text-4xl font-bold ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
              {isCredit ? '+' : '-'}{formatAmount(transaction.amount)}
            </p>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(transaction.status)}`}>
              {transaction.status}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Description</span>
              <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
                {transaction.title || transaction.description || '—'}
              </span>
            </div>

            {transaction.category && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{transaction.category}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{transaction.type}</span>
            </div>

            {transaction.fee > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Fee</span>
                <span className="text-sm font-medium text-gray-900">{formatAmount(transaction.fee)}</span>
              </div>
            )}

            {transaction.net_amount && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Net Amount</span>
                <span className="text-sm font-medium text-gray-900">{formatAmount(transaction.net_amount)}</span>
              </div>
            )}

            {transaction.bank_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Bank</span>
                <span className="text-sm font-medium text-gray-900">{transaction.bank_name}</span>
              </div>
            )}

            {transaction.account_name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Account Name</span>
                <span className="text-sm font-medium text-gray-900">{transaction.account_name}</span>
              </div>
            )}

            {transaction.reference && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reference</span>
                <button onClick={copyReference} className="flex items-center gap-1.5 text-sm font-mono text-gray-900 hover:text-[#1E3A5F]">
                  <span className="truncate max-w-[140px]">{transaction.reference}</span>
                  {copiedRef ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <Copy size={14} className="flex-shrink-0" />}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(transaction.created_at)}</span>
            </div>

            {transaction.completed_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Completed</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(transaction.completed_at)}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
