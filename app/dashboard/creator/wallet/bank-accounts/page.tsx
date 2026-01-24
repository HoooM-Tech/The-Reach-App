'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, ChevronRight, Building2, Plus } from 'lucide-react';
import { walletApi } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
  is_verified: boolean;
}

export default function BankAccountsPage() {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const data = await walletApi.getBankAccounts();
      setBankAccounts(data.bankAccounts || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast.error('Failed to load bank accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;

    try {
      await walletApi.deleteBankAccount(id);
      toast.success('Bank account deleted');
      fetchBankAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bank account');
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return `${accountNumber.slice(0, 4)}***${accountNumber.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] p-4">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="bg-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Select Bank Account</h1>
          <button className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Bank Account</h2>
          <p className="text-base text-gray-600 leading-relaxed">
            Where do you want to withdraw your funds to. You can add up to three banks on your profile.
          </p>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Building2 size={24} className="text-gray-400" />
            </div>
            <p className="text-base text-gray-500">Added bank details will appear here</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => {
                  // Go back to withdrawal page with selected bank
                  router.back();
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Building2 size={24} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{account.bank_name}</p>
                    <p className="text-sm text-gray-600">{account.account_name}</p>
                    <p className="text-sm text-gray-600">{maskAccountNumber(account.account_number)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {account.is_primary && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Primary</span>
                  )}
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}

        {bankAccounts.length < 3 && (
          <button
            onClick={() => router.push('/dashboard/creator/wallet/bank-accounts/add')}
            className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add a new bank account
          </button>
        )}
      </main>
    </div>
  );
}
