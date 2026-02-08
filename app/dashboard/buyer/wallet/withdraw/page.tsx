'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_primary: boolean;
}

export default function BuyerWithdrawPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [amount, setAmount] = useState('');
  const [cashBalance, setCashBalance] = useState(0);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, banksRes] = await Promise.all([
        fetch('/api/buyer/wallet/balance', { credentials: 'include' }),
        fetch('/api/buyer/wallet/bank-accounts', { credentials: 'include' }),
      ]);

      if (balanceRes.ok) {
        const balanceJson = await balanceRes.json();
        const balData = balanceJson.data || balanceJson;
        setCashBalance(parseFloat(balData.available_balance || balData.availableBalance || 0));
      }

      if (banksRes.ok) {
        const banksJson = await banksRes.json();
        const accounts: BankAccount[] = banksJson.data || banksJson.accounts || [];
        const savedBankId = typeof window !== 'undefined' ? sessionStorage.getItem('selected-bank-id') : null;
        const savedBank = savedBankId ? accounts.find(a => a.id === savedBankId) : null;
        const primary = accounts.find(a => a.is_primary);
        setSelectedBank(savedBank || primary || accounts[0] || null);
      }
    } catch (error) {
      console.error('Failed to fetch withdrawal data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (user) fetchData();
  }, [user, userLoading, router, fetchData]);

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount === '0' && num !== '.') { setAmount(num); return; }
    if (amount.includes('.')) {
      const decimals = amount.split('.')[1];
      if (decimals && decimals.length >= 2) return;
    }
    const newAmount = amount + num;
    const numericValue = parseFloat(newAmount);
    if (!isNaN(numericValue) && numericValue <= cashBalance) setAmount(newAmount);
  };

  const handleBackspace = () => setAmount(amount.slice(0, -1));

  const handleContinue = () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (numericAmount > cashBalance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!selectedBank) {
      toast.error('Please select a bank account');
      router.push('/dashboard/buyer/wallet/select-bank');
      return;
    }
    sessionStorage.setItem('withdrawal-amount', amount);
    sessionStorage.setItem('withdrawal-bank', JSON.stringify(selectedBank));
    router.push('/dashboard/buyer/wallet/review-transfer');
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
      <header className="fixed top-0 left-0 right-0 bg-[#F5F0EB] px-4 sm:px-6 py-4 flex items-center justify-between z-50">
        <button aria-label="Back" title="Back" onClick={() => router.push('/dashboard/buyer/wallet')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Withdraw from Wallet</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <div className="px-4 sm:px-6 pt-24 pb-32 max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-6">
          <div className="min-h-[200px] sm:min-h-[250px] flex items-center justify-center">
            <div className="text-4xl sm:text-5xl font-bold text-gray-900 text-center">
              ₦{amount || '0.00'}
              {amount && <span className="animate-pulse text-orange-400">|</span>}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-600">Cash balance</span>
              <span className="text-sm font-semibold text-gray-900">
                ₦{cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <button onClick={() => router.push('/dashboard/buyer/wallet/select-bank')} className="flex items-center justify-between py-1 w-full">
              <span className="text-sm text-gray-600">Withdraw to</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-[#F97316]">
                  {selectedBank ? `${selectedBank.bank_name} • ${selectedBank.account_number.slice(-4)}` : 'NGN Bank Account'}
                </span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </button>
          </div>
        </div>

        <div className="max-w-xs sm:max-w-sm mx-auto">
          <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} onClick={() => handleNumberPress(num.toString())} className="aspect-square bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md active:scale-95 transition-all">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">{num}</span>
                </button>
              ))}
              <button onClick={() => handleNumberPress('.')} className="aspect-square bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md active:scale-95 transition-all">
                <span className="text-xl sm:text-2xl font-bold text-gray-900">.</span>
              </button>
              <button onClick={() => handleNumberPress('0')} className="aspect-square bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md active:scale-95 transition-all">
                <span className="text-xl sm:text-2xl font-bold text-gray-900">0</span>
              </button>
              <button onClick={handleBackspace} className="aspect-square bg-gradient-to-br from-[#111827] to-[#1F2937] rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transition-all">
                <span className="text-white text-lg sm:text-xl font-bold">&#x232B;</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={!amount || parseFloat(amount) <= 0 || !selectedBank}
            className={`w-full py-3.5 rounded-2xl font-semibold transition-colors ${
              amount && parseFloat(amount) > 0 && selectedBank ? 'bg-[#1A3B5D] text-white hover:bg-[#1A3B5D]/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
