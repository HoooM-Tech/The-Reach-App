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

export default function ReviewTransferPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const fee = 100;
  const numericAmount = withdrawalAmount ? parseFloat(withdrawalAmount) : 0;
  const total = numericAmount + fee;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Load withdrawal details from sessionStorage (set by withdraw page)
    const amount = sessionStorage.getItem('withdrawal-amount');
    const bank = sessionStorage.getItem('withdrawal-bank');

    if (!amount || !bank) {
      // No withdrawal data - redirect back
      router.push('/dashboard/developer/wallet/withdraw');
      return;
    }

    setWithdrawalAmount(amount);
    try {
      setSelectedBank(JSON.parse(bank));
    } catch {
      router.push('/dashboard/developer/wallet/withdraw');
    }
  }, [user, userLoading, router]);

  const maskAccountNumber = (num: string) => {
    if (num.length <= 4) return num;
    return `${num.slice(0, 5)}***${num.slice(-2)}`;
  };

  const handleProceed = () => {
    router.push('/dashboard/developer/wallet/enter-pin');
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="bg-transparent px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Review bank transfer</h1>
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
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-32 max-w-2xl mx-auto">
        {/* Bank Icon */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Building2 size={32} className="text-gray-600 sm:hidden" />
            <Building2 size={40} className="text-gray-600 hidden sm:block" />
          </div>
        </div>

        {/* Transfer Details */}
        <div className="space-y-0">
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <span className="text-sm text-gray-600">Destination</span>
            <span className="text-sm font-semibold text-gray-900">
              {selectedBank
                ? `${maskAccountNumber(selectedBank.account_number)} \u2022 ${selectedBank.bank_name}`
                : 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <span className="text-sm text-gray-600">Account Name:</span>
            <span className="text-sm font-semibold text-gray-900">
              {selectedBank?.account_name || 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <span className="text-sm text-gray-600">Bank name:</span>
            <span className="text-sm font-semibold text-gray-900">
              {selectedBank?.bank_name || 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <span className="text-sm text-gray-600">Fee:</span>
            <span className="text-sm font-semibold text-gray-900">₦{fee.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between py-6">
            <span className="text-lg font-bold text-gray-900">Total:</span>
            <span className="text-lg font-bold text-gray-900">
              ₦{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Proceed Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:p-6 pb-6 sm:pb-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleProceed}
            className="w-full bg-[#1E3A5F] text-white font-semibold py-4 rounded-2xl hover:bg-[#1E3A5F]/90 transition-colors"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
