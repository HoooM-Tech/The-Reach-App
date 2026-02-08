'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TransactionData {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
}

export default function WithdrawalSuccessPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [txData, setTxData] = useState<TransactionData | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Load transaction data from sessionStorage
    const data = sessionStorage.getItem('withdrawal-transaction');
    if (data) {
      try {
        setTxData(JSON.parse(data));
      } catch {
        console.error('Failed to parse transaction data');
      }
    }

    // Clean up sessionStorage
    sessionStorage.removeItem('withdrawal-amount');
    sessionStorage.removeItem('withdrawal-bank');
    sessionStorage.removeItem('withdrawal-transaction');
    sessionStorage.removeItem('selected-bank-id');
  }, [user, userLoading, router]);

  const maskAccountNumber = (num: string) => {
    if (!num || num.length <= 4) return num || '';
    return `${num.slice(0, 3)}*******${num.slice(-2)}`;
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA] flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="text-center max-w-sm w-full">
        {/* Success Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-white sm:hidden" />
          <Check size={48} className="text-white hidden sm:block" />
        </div>

        {/* Success Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Withdrawal Initiated</h2>
        <p className="text-gray-600 mb-10 sm:mb-12 leading-relaxed">
          Your withdrawal of{' '}
          <span className="font-semibold text-gray-900">
            ₦{txData?.amount ? txData.amount.toLocaleString() : '0'}
          </span>{' '}
          has been initiated to your bank account
          {txData?.accountNumber && txData?.bankName && (
            <>
              {' '}({maskAccountNumber(txData.accountNumber)}/{txData.bankName})
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => {
              if (txData?.id) {
                router.push(`/dashboard/developer/wallet/transactions/${txData.id}`);
              } else {
                router.push('/dashboard/developer/wallet/transactions');
              }
            }}
            className="w-full bg-[#1E3A5F] text-white font-semibold py-4 rounded-2xl hover:bg-[#1E3A5F]/90 transition-colors"
          >
            View Transaction
          </button>
          <button
            onClick={() => router.push('/dashboard/developer/wallet')}
            className="w-full bg-white border-2 border-gray-200 text-gray-900 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
