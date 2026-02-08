'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
}

export default function BuyerReviewTransferPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const fee = 100;
  const numericAmount = withdrawalAmount ? parseFloat(withdrawalAmount) : 0;
  const total = numericAmount + fee;

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    const amount = sessionStorage.getItem('withdrawal-amount');
    const bank = sessionStorage.getItem('withdrawal-bank');
    if (!amount || !bank) {
      router.push('/dashboard/buyer/wallet/withdraw');
      return;
    }
    setWithdrawalAmount(amount);
    try { setSelectedBank(JSON.parse(bank)); } catch { router.push('/dashboard/buyer/wallet/withdraw'); }
  }, [user, userLoading, router]);

  const maskAccountNumber = (num: string) => {
    if (num.length <= 4) return num;
    return `${num.slice(0, 5)}***${num.slice(-2)}`;
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="bg-transparent px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Review bank transfer</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <div className="px-4 sm:px-6 pt-6 pb-32 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 mb-2">Amount to withdraw</p>
            <p className="text-4xl sm:text-5xl font-bold text-gray-900">
              ₦{numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {selectedBank && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Building2 className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{selectedBank.bank_name}</p>
                <p className="text-sm text-gray-500">{selectedBank.account_name}</p>
                <p className="text-sm text-gray-400">{maskAccountNumber(selectedBank.account_number)}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-semibold text-gray-900">₦{numericAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Fee</span>
              <span className="text-sm font-semibold text-gray-900">₦{fee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Total debit</span>
              <span className="text-sm font-bold text-gray-900">₦{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:p-6 pb-6 sm:pb-8">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/dashboard/buyer/wallet/enter-pin')}
            className="w-full py-4 bg-[#1A3B5D] text-white rounded-2xl font-semibold hover:bg-[#1A3B5D]/90 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
