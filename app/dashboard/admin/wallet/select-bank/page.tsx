'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Building2, ChevronRight, Plus, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
}

export default function AdminSelectBankPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet/bank-accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.data?.accounts || data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (user) fetchBankAccounts();
    const savedId = sessionStorage.getItem('selected-bank-id');
    if (savedId) setSelectedBankId(savedId);
  }, [user, userLoading, router, fetchBankAccounts]);

  const handleSelectBank = (account: BankAccount) => {
    sessionStorage.setItem('selected-bank-id', account.id);
    sessionStorage.setItem('withdrawal-bank', JSON.stringify(account));
    router.back();
  };

  const maskAccountNumber = (num: string) => {
    if (!num || num.length < 4) return num;
    return '****' + num.slice(-4);
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA] flex flex-col">
      <header className="px-4 sm:px-6 py-4 bg-white">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="mb-4 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Select Bank Account</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Where do you want to withdraw your funds to. You can add up to three banks on your profile.
        </p>
      </header>

      <main className="flex-1 px-4 sm:px-6 pt-6 pb-32 max-w-lg mx-auto w-full">
        {bankAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">Added bank details will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleSelectBank(account)}
                className={`w-full bg-white rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left ${selectedBankId === account.id ? 'ring-2 ring-[#1E3A5F]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{account.bank_name}</p>
                    <p className="text-sm text-gray-500">{account.account_name}</p>
                    <p className="text-sm text-gray-400">{maskAccountNumber(account.account_number)}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </main>

      {bankAccounts.length < 3 && (
        <div className="sticky bottom-0 px-4 sm:px-6 py-4 bg-white border-t border-gray-100">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => router.push('/dashboard/admin/wallet/add-bank')}
              className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-semibold text-lg hover:bg-[#1E3A5F]/90 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add a new bank account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
