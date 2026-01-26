'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { walletApi, ApiError } from '@/lib/api/client';
import { ArrowLeft, Bell, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TransactionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const transactionId = (params?.id as string) || '';
  
  const [transaction, setTransaction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch transaction from wallet API
  const fetchTransaction = useCallback(async () => {
    if (!transactionId || !user?.id) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const transactionData = await walletApi.getTransaction(transactionId);
      const foundTransaction = transactionData.transaction;
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        if (foundTransaction) {
          setTransaction(foundTransaction);
        } else {
          setError('Transaction not found');
        }
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load transaction';
      setError(message);
      console.error('Transaction fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [transactionId, user?.id]);

  useEffect(() => {
    if (!transactionId) {
      router.push('/dashboard/developer/wallet/transactions');
      return;
    }

    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    fetchTransaction();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [transactionId, user, userLoading, fetchTransaction, router]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#0A1628] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction not found</h3>
            <p className="text-gray-600 mb-4">{error || 'This transaction may have been removed or is no longer available.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/developer/wallet/transactions')}
                className="px-6 py-3 bg-[#0A1628] text-white rounded-xl font-medium"
              >
                Back to Transactions
              </button>
              <button
                onClick={fetchTransaction}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          aria-label="Back"
          title="Back"
          onClick={() => router.push('/dashboard/developer/wallet/transactions')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Transaction details</h1>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pt-6 pb-32">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Transaction Status */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <span className="text-sm text-gray-600">Transaction status</span>
            <span className={`text-sm font-semibold ${
              transaction.status === 'completed' ? 'text-green-600' :
              transaction.status === 'pending' ? 'text-orange-600' :
              transaction.status === 'failed' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {transaction.status || 'N/A'}
            </span>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Amount</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatAmount(Math.abs(transaction.amount))}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm text-gray-600">Type</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {transaction.type || 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm text-gray-600">Date</span>
              <span className="text-sm font-semibold text-gray-900">
                {new Date(transaction.created_at).toLocaleDateString()} at{' '}
                {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm text-gray-600">Description</span>
              <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%]">
                {transaction.description || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 pb-8">
        <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-4 rounded-full"></div>
        <button
          onClick={() => {
            // Share functionality
            if (navigator.share) {
              navigator.share({
                title: 'Transaction Details',
                text: `Transaction ${transaction.id} - ${formatAmount(Math.abs(transaction.amount))}`
              });
            } else {
              alert('Share functionality not available');
            }
          }}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
        >
          Share
        </button>
      </div>
    </div>
  );
}

