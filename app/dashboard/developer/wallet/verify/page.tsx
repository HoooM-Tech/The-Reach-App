'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

type TransactionStatus = 'loading' | 'success' | 'pending' | 'failed' | 'error';

interface TransactionData {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  category: string;
  currency: string;
  completed_at: string | null;
  created_at: string;
}

export default function VerifyPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();
  
  const [status, setStatus] = useState<TransactionStatus>('loading');
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 15; // Check for up to 15 seconds (with direct Paystack verification)

  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    if (!reference) {
      toast.error('Invalid payment reference');
      router.push('/dashboard/developer/wallet');
      return;
    }

    // Start verifying transaction
    verifyTransaction();
  }, [reference, user, userLoading, router]);

  const verifyTransaction = async () => {
    if (!reference) return;

    try {
      const response = await fetch(
        `/api/wallet/verify-transaction?reference=${encodeURIComponent(reference)}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to verify transaction' }));
        
        // If transaction not found yet, retry
        if (response.status === 404 && retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            verifyTransaction();
          }, 1000); // Retry after 1 second
          return;
        }

        throw new Error(errorData.error || 'Failed to verify transaction');
      }

      const data = await response.json();
      const transactionData = data.data?.transaction;
      const walletData = data.data?.wallet;

      if (!transactionData) {
        throw new Error('Invalid response from server');
      }

      setTransaction(transactionData);
      setNewBalance(walletData?.available_balance || null);

      // Determine status based on transaction status
      if (transactionData.status === 'successful' || transactionData.status === 'completed') {
        setStatus('success');
        toast.success('Payment successful! Your wallet has been credited.');
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
          router.push('/dashboard/developer/wallet');
        }, 5000);
      } else if (transactionData.status === 'pending' || transactionData.status === 'processing') {
        // Still pending or processing, retry
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            verifyTransaction();
          }, 1000);
        } else {
          setStatus('pending');
          toast('Payment is still processing. The webhook will update it shortly. Please check back later.', {
            icon: '⏳',
            duration: 5000,
          });
        }
      } else if (transactionData.status === 'failed') {
        setStatus('failed');
        toast.error('Payment failed. Please try again.');
      } else {
        setStatus('error');
        toast.error(`Unknown transaction status: ${transactionData.status}`);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      
      // Retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          verifyTransaction();
        }, 1000);
      } else {
        setStatus('error');
        toast.error(error.message || 'Failed to verify payment');
      }
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (userLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-reach-navy border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying payment...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Checking... ({retryCount}/{maxRetries})
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex flex-col items-center justify-center px-6">
        {/* Error Icon */}
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <X size={48} className="text-red-600" />
        </div>

        {/* Error Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h2>
        <p className="text-center text-gray-600 mb-12 max-w-sm">
          We couldn&apos;t verify your payment. Please check your transaction history or contact support.
        </p>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => router.push('/dashboard/developer/wallet/transactions')}
            className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
          >
            View Transactions
          </button>
          <button
            onClick={() => router.push('/dashboard/developer/wallet')}
            className="w-full bg-white border-2 border-gray-200 text-gray-900 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex flex-col items-center justify-center px-6">
        {/* Failed Icon */}
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <X size={48} className="text-red-600" />
        </div>

        {/* Failed Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Failed</h2>
        <p className="text-center text-gray-600 mb-12 max-w-sm">
          Your payment could not be processed. Please try again or contact support if the issue persists.
        </p>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => router.push('/dashboard/developer/wallet/add-funds')}
            className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/dashboard/developer/wallet')}
            className="w-full bg-white border-2 border-gray-200 text-gray-900 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex flex-col items-center justify-center px-6">
        {/* Pending Icon */}
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
          <Loader2 size={48} className="text-yellow-600 animate-spin" />
        </div>

        {/* Pending Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Processing</h2>
        <p className="text-center text-gray-600 mb-12 max-w-sm">
          Your payment is being processed. This may take a few moments. Please check back later or view your transaction history.
        </p>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => router.push('/dashboard/developer/wallet/transactions')}
            className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
          >
            View Transactions
          </button>
          <button
            onClick={() => router.push('/dashboard/developer/wallet')}
            className="w-full bg-white border-2 border-gray-200 text-gray-900 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-[#FDFBFA] flex flex-col items-center justify-center px-6">
      {/* Success Icon */}
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
        <Check size={48} className="text-white" />
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
      <p className="text-center text-gray-600 mb-8 max-w-sm">
        Your wallet has been credited successfully.
      </p>

      {/* Transaction Details */}
      {transaction && (
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount</span>
              <span className="text-lg font-bold text-gray-900">
                {formatAmount(transaction.amount)}
              </span>
            </div>
            {transaction.fee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Fee</span>
                <span className="text-gray-900">{formatAmount(transaction.fee)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-semibold">Total Credited</span>
                <span className="text-xl font-bold text-green-600">
                  {formatAmount(transaction.net_amount)}
                </span>
              </div>
            </div>
            {newBalance !== null && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">New Balance</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatAmount(newBalance)}
                  </span>
                </div>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs text-gray-500">
                Reference: {transaction.reference}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => router.push('/dashboard/developer/wallet/transactions')}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
        >
          View Transaction
        </button>
        <button
          onClick={() => router.push('/dashboard/developer/wallet')}
          className="w-full bg-white border-2 border-gray-200 text-gray-900 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-colors"
        >
          Back to Wallet
        </button>
      </div>

      {/* Auto-redirect notice */}
      <p className="text-sm text-gray-500 mt-6">
        Redirecting to wallet in 5 seconds...
      </p>
    </div>
  );
}
