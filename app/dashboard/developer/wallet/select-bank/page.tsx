'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Building2, Users, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export default function SelectBankPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Load bank accounts from localStorage
    const savedAccounts = localStorage.getItem('bank-accounts');
    if (savedAccounts) {
      try {
        setBankAccounts(JSON.parse(savedAccounts));
      } catch (e) {
        console.error('Failed to parse bank accounts:', e);
      }
    }
  }, [user, userLoading, router]);

  const handleSelectBank = (account: BankAccount) => {
    // Store selected bank account for withdrawal
    localStorage.setItem('selected-bank-account', JSON.stringify(account));
    router.back();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-navy border-t-transparent animate-spin"></div>
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
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="flex-1 ml-4">
          <h1 className="text-lg font-semibold text-gray-900">Select Bank Account</h1>
          <p className="text-xs text-gray-500 mt-1">
            Where do you want to withdraw your funds to. You can add up to three banks on your profile.
          </p>
        </div>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm ml-2"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pb-32">
        <div className="bg-white rounded-3xl p-6 shadow-sm min-h-[200px]">
          {bankAccounts.length === 0 ? (
            <>
              {/* Empty State Placeholder */}
              <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                  <Users size={24} className="text-gray-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <p className="text-center text-gray-500 text-sm">Added bank details will appear here</p>
            </>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectBank(account)}
                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Building2 size={24} className="text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">{account.bankName}</p>
                    <p className="text-sm text-gray-600 mt-1">{account.accountName}</p>
                    <p className="text-sm text-gray-600">{account.accountNumber}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Bank Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 pb-8">
        <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-4 rounded-full"></div>
        <button
          onClick={() => router.push('/dashboard/developer/wallet/add-bank')}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
        >
          Add a new bank account
        </button>
      </div>
    </div>
  );
}


