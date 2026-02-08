'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Check, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TransactionData {
  id: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
  status: string;
  createdAt: string;
}

export default function AdminWithdrawalSuccessPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [txData, setTxData] = useState<TransactionData | null>(null);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (!user) return;
    const data = sessionStorage.getItem('withdrawal-transaction');
    if (data) {
      try { setTxData(JSON.parse(data)); } catch { /* ignore */ }
    }
    // Cleanup
    sessionStorage.removeItem('withdrawal-amount');
    sessionStorage.removeItem('withdrawal-bank');
    sessionStorage.removeItem('withdrawal-transaction');
    sessionStorage.removeItem('selected-bank-id');
  }, [user, userLoading, router]);

  const formatAmount = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const maskAccountNumber = (num: string) => {
    if (!num || num.length < 4) return num;
    return '****' + num.slice(-4);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* Green Check */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto mb-8">
          <Check className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Withdrawal Initiated!
        </h1>

        {txData ? (
          <>
            <p className="text-gray-500 mb-8 text-sm sm:text-base">
              ₦{formatAmount(txData.amount)} is being sent to{' '}
              {txData.bankName} ({maskAccountNumber(txData.accountNumber)})
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-900">₦{formatAmount(txData.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bank</span>
                  <span className="font-semibold text-gray-900">{txData.bankName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Account</span>
                  <span className="font-semibold text-gray-900">{txData.accountName}</span>
                </div>
                {txData.reference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reference</span>
                    <span className="font-mono text-xs text-gray-900">{txData.reference}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className="text-[#FF6B35] font-medium capitalize">{txData.status}</span>
                </div>
              </div>
            </div>

            {txData.id && (
              <button
                onClick={() => router.push(`/dashboard/admin/wallet/transactions/${txData.id}`)}
                className="w-full max-w-sm mx-auto py-4 bg-[#1E3A5F] text-white rounded-full font-semibold text-lg hover:bg-[#1E3A5F]/90 transition-colors flex items-center justify-center gap-2 mb-3"
              >
                View Transaction
                <ArrowRight size={18} />
              </button>
            )}
          </>
        ) : (
          <p className="text-gray-500 mb-8">Your withdrawal is being processed.</p>
        )}

        <button
          onClick={() => router.push('/dashboard/admin/wallet')}
          className={`w-full max-w-sm mx-auto py-4 rounded-full font-semibold text-lg transition-colors ${txData?.id ? 'text-[#1E3A5F] border border-[#1E3A5F] hover:bg-gray-50' : 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90'}`}
        >
          Back to Wallet
        </button>
      </div>
    </div>
  );
}
