'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Bell, Building2 } from 'lucide-react';
import { walletApi } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
}

export default function ReviewWithdrawalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = parseFloat(searchParams.get('amount') || '0');
  const bankId = searchParams.get('bankId') || '';

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [fee] = useState(Math.max(amount * 0.01, 100)); // 1% or minimum ₦100
  const total = amount + fee;

  useEffect(() => {
    const fetchBankAccount = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const data = await walletApi.getBankAccounts();
        const account = data.bankAccounts.find((acc: BankAccount) => acc.id === bankId);
        if (account) {
          setBankAccount(account);
        } else {
          toast.error('Bank account not found');
          router.push('/dashboard/creator/wallet/withdraw');
        }
      } catch (error) {
        console.error('Error fetching bank account:', error);
        toast.error('Failed to load bank account');
      } finally {
        setIsLoading(false);
      }
    };

    if (bankId) {
      fetchBankAccount();
    }
  }, [bankId, router]);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return `${accountNumber.slice(0, 4)}***${accountNumber.slice(-4)}`;
  };

  const handleProceed = () => {
    setShowPinModal(true);
  };

  const handlePinSubmit = async (pin: string) => {
    try {
      await walletApi.withdraw({
        amount,
        bankAccountId: bankId,
        pin,
      });
      toast.success('Withdrawal initiated successfully');
      router.push(`/dashboard/creator/wallet/withdraw/success?amount=${amount}&bank=${encodeURIComponent(bankAccount?.bank_name || '')}&account=${maskAccountNumber(bankAccount?.account_number || '')}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate withdrawal');
      setShowPinModal(false);
    }
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

  if (!bankAccount) {
    return null;
  }

  return (
    <>
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
            <h1 className="text-xl font-semibold text-gray-900">Review bank transfer</h1>
            <button className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <Bell size={20} className="text-gray-600" />
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6">
            {/* Bank Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                <Building2 size={32} className="text-gray-600" />
              </div>
            </div>

            {/* Transfer Details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-base text-gray-900">Destination</span>
                <span className="text-base font-semibold text-gray-900">
                  {maskAccountNumber(bankAccount.account_number)} • {bankAccount.bank_name}
                </span>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-base text-gray-900">Account Name:</span>
                <span className="text-base font-semibold text-gray-900">{bankAccount.account_name}</span>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-base text-gray-900">Bank name:</span>
                <span className="text-base font-semibold text-gray-900">{bankAccount.bank_name}</span>
              </div>

              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-base text-gray-900">Fee:</span>
                <span className="text-base font-semibold text-gray-900">{formatAmount(fee)}</span>
              </div>

              <div className="flex justify-between items-center py-4 border-b-2 border-gray-300">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-gray-900">{formatAmount(total)}</span>
              </div>
            </div>

            {/* Proceed Button */}
            <button
              onClick={handleProceed}
              className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors mt-8"
            >
              Proceed
            </button>
          </div>
        </main>
      </div>

      {/* PIN Entry Modal */}
      {showPinModal && (
        <PinEntryModal
          onClose={() => setShowPinModal(false)}
          onSubmit={handlePinSubmit}
          title="Enter PIN to withdraw"
        />
      )}
    </>
  );
}

// PIN Entry Modal Component
function PinEntryModal({ onClose, onSubmit, title }: { onClose: () => void; onSubmit: (pin: string) => void; title: string }) {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const pinInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handlePinInput = (value: string, index: number) => {
    if (!/^\d$/.test(value) && value !== '') return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }

    if (newPin.every(d => d !== '') && newPin.join('').length === 4) {
      setTimeout(() => {
        onSubmit(newPin.join(''));
      }, 200);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    } else if (e.key === 'Backspace' && pin[index]) {
      const newPin = [...pin];
      newPin[index] = '';
      setPin(newPin);
    }
  };

  const handleNumberClick = (num: string) => {
    if (activeIndex < 4 && pin[activeIndex] === '') {
      handlePinInput(num, activeIndex);
    }
  };

  const handleBackspace = () => {
    const lastFilledIndex = pin.findIndex((d, i) => d === '' && i > 0) - 1;
    const indexToClear = lastFilledIndex >= 0 ? lastFilledIndex : 3;
    if (pin[indexToClear]) {
      const newPin = [...pin];
      newPin[indexToClear] = '';
      setPin(newPin);
      setActiveIndex(indexToClear);
      pinInputRefs.current[indexToClear]?.focus();
    }
  };

  React.useEffect(() => {
    pinInputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">{title}</h2>

        {/* PIN Display */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-5 h-5 rounded-full border-2 ${
                pin[index] ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Hidden Inputs */}
        <div className="absolute opacity-0 pointer-events-none">
          {[0, 1, 2, 3].map((index) => (
            <input
              key={index}
              ref={(el) => {
                pinInputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={pin[index]}
              onChange={(e) => handlePinInput(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setActiveIndex(index)}
            />
          ))}
        </div>

        {/* Numeric Keypad */}
        <div className="bg-gray-100 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(String(num))}
                className="w-full aspect-square bg-white rounded-xl font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div />
            <button
              onClick={() => handleNumberClick('0')}
              className="w-full aspect-square bg-white rounded-xl font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="w-full aspect-square bg-white rounded-xl flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className="text-xl">⌫</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
