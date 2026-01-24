'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

export default function WithdrawalSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get('amount') || '0';
  const bank = searchParams.get('bank') || '';
  const account = searchParams.get('account') || '';

  const formatAmount = (value: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(parseFloat(value));
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-30 h-30 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Check size={48} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Withdrawal Initiated</h1>
        <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-sm mx-auto">
          Your withdrawal of {formatAmount(amount)} has been initiated to your bank account ({account}/{bank})
        </p>
        <button
          onClick={() => router.push(`/dashboard/creator/wallet/transactions`)}
          className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors mb-4"
        >
          View Transaction
        </button>
        <button
          onClick={() => router.push('/dashboard/creator/wallet')}
          className="w-full text-base text-[#1E3A5F] font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}
