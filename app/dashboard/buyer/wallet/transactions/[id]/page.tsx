'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function BuyerTransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params?.id as string;
  const { user, isLoading: userLoading } = useUser();

  const [transaction, setTransaction] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const fetchTransaction = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/buyer/wallet/transactions/${transactionId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load transaction');
      const data = await res.json();
      const tx = data.data?.transaction || data.transaction;
      setTransaction(tx || null);
    } catch (err) {
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
    return new Date(dateString).toLocaleString('en-NG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyReference = () => {
    const ref = transaction?.reference as string;
    if (ref) {
      navigator.clipboard.writeText(ref);
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
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction not found</h3>
          <p className="text-gray-600 mb-6">{error || 'This transaction may no longer be available.'}</p>
          <button
            onClick={() => router.push('/dashboard/buyer/wallet/transactions')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A3B5D] text-white rounded-xl font-medium"
          >
            Back to Transactions
          </button>
        </div>
      </div>
    );
  }

  const amount = Number(transaction.amount ?? 0);
  const isCredit = transaction.type === 'credit' || transaction.type === 'deposit' || amount > 0;
  const status = (transaction.status as string) || '';

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-[#F5F0EB]">
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
          <div className="text-center mb-8">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isCredit ? 'bg-green-50' : 'bg-orange-50'}`}>
              {isCredit ? (
                <ArrowDownRight size={24} className="text-green-500" />
              ) : (
                <ArrowUpRight size={24} className="text-orange-500" />
              )}
            </div>
            <p className={`text-3xl sm:text-4xl font-bold ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
              {isCredit ? '+' : '-'}{formatAmount(amount)}
            </p>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(status)}`}>
              {status}
            </span>
          </div>

          <div className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Description</span>
              <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
                {String(transaction.title ?? transaction.description ?? '—')}
              </span>
            </div>
            {transaction.category != null && transaction.category !== '' ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{String(transaction.category)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Type</span>
              <span className="text-sm font-medium text-gray-900 capitalize">{String(transaction.type)}</span>
            </div>
            {Number(transaction.fee) > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Fee</span>
                <span className="text-sm font-medium text-gray-900">{formatAmount(Number(transaction.fee))}</span>
              </div>
            ) : null}
            {transaction.reference ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Reference</span>
                <button onClick={copyReference} className="flex items-center gap-1.5 text-sm font-mono text-gray-900 hover:text-[#1A3B5D]">
                  <span className="truncate max-w-[140px]">{String(transaction.reference)}</span>
                  {copiedRef ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" /> : <Copy size={14} className="flex-shrink-0" />}
                </button>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(transaction.created_at as string)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
