'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Building2, Users, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_primary: boolean;
}

export default function BuyerSelectBankPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/buyer/wallet/bank-accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.data || data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (user) fetchBankAccounts();
  }, [user, userLoading, router, fetchBankAccounts]);

  const handleSelectBank = (account: BankAccount) => {
    sessionStorage.setItem('selected-bank-id', account.id);
    sessionStorage.setItem('withdrawal-bank', JSON.stringify(account));
    router.back();
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="bg-white px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-3">
          <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Select Bank Account</h1>
        <p className="text-xs sm:text-sm text-gray-500">
          Where do you want to withdraw your funds to. You can add up to three banks on your profile.
        </p>
      </header>

      <div className="px-4 sm:px-6 pt-6 pb-32 max-w-2xl mx-auto">
        {bankAccounts.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-gray-400" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
            <p className="text-center text-gray-500 text-sm">Added bank details will appear here</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectBank(account)}
                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={24} className="text-gray-600" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{account.bank_name}</p>
                    <p className="text-sm text-gray-600 truncate">{account.account_name}</p>
                    <p className="text-sm text-gray-500">{account.account_number}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {bankAccounts.length < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:p-6 pb-6 sm:pb-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => router.push('/dashboard/buyer/wallet/add-bank')}
              className="w-full bg-[#1A3B5D] text-white font-semibold py-4 rounded-2xl hover:bg-[#1A3B5D]/90 transition-colors"
            >
              Add a new bank account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
