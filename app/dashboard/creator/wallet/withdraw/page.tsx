'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, ChevronRight } from 'lucide-react';
import { walletApi } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
}

export default function WithdrawPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use walletApi methods which handle cookie-based authentication automatically
        // Middleware will handle redirect if user is not authenticated
        const [balanceData, accountsData] = await Promise.all([
          walletApi.getBalance(),
          walletApi.getBankAccounts(),
        ]);

        // walletApi.getBalance() returns normalized structure: { availableBalance, lockedBalance, ... }
        setBalance(balanceData.availableBalance || 0);

        // walletApi.getBankAccounts() returns: { bankAccounts: [...] }
        const accounts = accountsData.bankAccounts || [];
        setBankAccounts(accounts);
        if (accounts.length > 0) {
          const primary = accounts.find((acc: BankAccount) => acc.is_primary);
          setSelectedBankId(primary?.id || accounts[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Don't redirect to login - middleware handles authentication
        // Just show error message
        toast.error('Failed to load wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleAmountChange = (value: string) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    // Only allow one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  };

  const handleContinue = () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amountNum > balance) {
      toast.error('Amount exceeds available balance');
      return;
    }
    if (!selectedBankId) {
      toast.error('Please select a bank account');
      return;
    }
    if (bankAccounts.length === 0) {
      router.push('/dashboard/creator/wallet/bank-accounts/add');
      return;
    }
    router.push(`/dashboard/creator/wallet/withdraw/review?amount=${amountNum}&bankId=${selectedBankId}`);
  };

  const selectedBank = bankAccounts.find(acc => acc.id === selectedBankId);

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
      <header className="px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/*
          <button
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          */}
          <h1 className="text-xl font-semibold text-gray-900">Withdraw from Wallet</h1>
          {/*
          <button className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <Bell size={20} className="text-gray-600" />
          </button>
          */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6">
          {/* Amount Input */}
          <div className="text-center mb-12">
            <div className="relative inline-block">
              <span className="text-5xl font-bold text-gray-900">
                {amount ? formatAmount(parseFloat(amount)) : '₦0.00'}
              </span>
              {amount && (
                <span className="absolute -right-2 top-0 w-0.5 h-8 bg-orange-500 animate-pulse" />
              )}
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="absolute opacity-0 w-0 h-0"
              autoFocus
            />
          </div>

          {/* Cash Balance */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200">
            <span className="text-base text-gray-900">Cash balance</span>
            <span className="text-base font-semibold text-gray-900">{formatAmount(balance)}</span>
          </div>

          {/* Withdraw To */}
          <div className="flex justify-between items-center py-4 border-b border-gray-200">
            <span className="text-base text-gray-900">Withdraw to</span>
            <button
              onClick={() => {
                if (bankAccounts.length === 0) {
                  router.push('/dashboard/creator/wallet/bank-accounts/add');
                } else {
                  router.push('/dashboard/creator/wallet/bank-accounts');
                }
              }}
              className="text-base font-semibold text-orange-500 flex items-center gap-2"
            >
              {selectedBank ? `${selectedBank.bank_name} • ${selectedBank.account_number.slice(-4)}` : 'NGN Bank Account'}
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || !selectedBankId}
            className={`w-full py-4 rounded-full font-medium mt-8 ${
              amount && parseFloat(amount) > 0 && parseFloat(amount) <= balance && selectedBankId
                ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } transition-colors`}
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}
