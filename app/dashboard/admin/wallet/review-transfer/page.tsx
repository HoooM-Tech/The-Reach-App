'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
}

export default function AdminReviewTransferPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [withdrawalAmount, setWithdrawalAmount] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (!user) return;
    const amount = sessionStorage.getItem('withdrawal-amount');
    const bank = sessionStorage.getItem('withdrawal-bank');
    if (!amount || !bank) {
      router.push('/dashboard/admin/wallet/withdraw');
      return;
    }
    setWithdrawalAmount(amount);
    try { setSelectedBank(JSON.parse(bank)); } catch { router.push('/dashboard/admin/wallet/withdraw'); }
  }, [user, userLoading, router]);

  const fee = 100;
  const amountNum = parseFloat(withdrawalAmount || '0');
  const totalDebit = amountNum + fee;

  const formatAmount = (val: number) =>
    new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const maskAccountNumber = (num: string) => {
    if (!num || num.length < 4) return num;
    return '****' + num.slice(-4);
  };

  if (userLoading || !withdrawalAmount || !selectedBank) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA] flex flex-col">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-transparent">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Review Bank Transfer</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <main className="flex-1 px-4 sm:px-6 pt-6 pb-32 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Amount */}
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500 mb-2">Amount to withdraw</p>
            <p className="text-4xl sm:text-5xl font-bold text-gray-900">₦{formatAmount(amountNum)}</p>
          </div>

          {/* Bank Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{selectedBank.bank_name}</p>
              <p className="text-sm text-gray-500">{selectedBank.account_name}</p>
              <p className="text-sm text-gray-400">{maskAccountNumber(selectedBank.account_number)}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-sm font-semibold text-gray-900">₦{formatAmount(amountNum)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Fee</span>
              <span className="text-sm font-semibold text-gray-900">₦{formatAmount(fee)}</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Total Debit</span>
              <span className="text-sm font-bold text-gray-900">₦{formatAmount(totalDebit)}</span>
            </div>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 px-4 sm:px-6 py-4 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/dashboard/admin/wallet/enter-pin')}
            className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-semibold text-lg hover:bg-[#1E3A5F]/90 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
