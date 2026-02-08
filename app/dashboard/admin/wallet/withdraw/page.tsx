'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
}

export default function AdminWithdrawPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [amount, setAmount] = useState('');
  const [cashBalance, setCashBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, banksRes] = await Promise.all([
        fetch('/api/wallet/balance', { credentials: 'include' }),
        fetch('/api/wallet/bank-accounts', { credentials: 'include' }),
      ]);

      if (balanceRes.ok) {
        const bJson = await balanceRes.json();
        const bData = bJson.data || bJson;
        setCashBalance(parseFloat(bData.available_balance || bData.availableBalance || 0));
      }

      if (banksRes.ok) {
        const bankJson = await banksRes.json();
        const accounts = bankJson.data?.accounts || bankJson.accounts || [];
        setBankAccounts(accounts);

        // Check for previously selected bank
        const savedBankId = sessionStorage.getItem('selected-bank-id');
        if (savedBankId) {
          const found = accounts.find((a: BankAccount) => a.id === savedBankId);
          if (found) setSelectedBank(found);
        }

        // Try stored withdrawal bank
        const storedBank = sessionStorage.getItem('withdrawal-bank');
        if (storedBank && !savedBankId) {
          try {
            const parsed = JSON.parse(storedBank);
            const found = accounts.find((a: BankAccount) => a.id === parsed.id);
            if (found) setSelectedBank(found);
          } catch { /* ignore */ }
        }

        // Default to primary or first bank
        if (!selectedBank && !savedBankId && !storedBank && accounts.length > 0) {
          const primary = accounts.find((a: BankAccount) => a.is_primary);
          setSelectedBank(primary || accounts[0]);
        }
      }

      // Restore saved amount
      const savedAmount = sessionStorage.getItem('withdrawal-amount');
      if (savedAmount) setAmount(savedAmount);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBank]);

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    if (user) fetchData();
  }, [user, userLoading, router, fetchData]);

  const handleNumberPress = (num: string) => {
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
    setAmount((prev) => {
      const newVal = prev === '0' && num !== '.' ? num : prev + num;
      return newVal;
    });
  };

  const handleDot = () => {
    if (amount.includes('.')) return;
    setAmount((prev) => (prev === '' ? '0.' : prev + '.'));
  };

  const handleBackspace = () => {
    setAmount((prev) => prev.slice(0, -1));
  };

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
      router.push('/dashboard/admin/wallet/select-bank');
      return;
    }
    sessionStorage.setItem('withdrawal-amount', amount);
    sessionStorage.setItem('withdrawal-bank', JSON.stringify(selectedBank));
    router.push('/dashboard/admin/wallet/review-transfer');
  };

  const formatAmount = (val: number) =>
    new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  const displayAmount = amount
    ? `₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '₦0.00';

  if (userLoading || isLoading) {
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
        <h1 className="text-lg font-semibold text-gray-900">Withdraw from Wallet</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <main className="flex-1 px-4 sm:px-6 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-6 min-h-[280px] flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <p className={`text-4xl sm:text-5xl font-bold text-center ${amount && parseFloat(amount) > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
              {displayAmount}
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Cash balance</span>
              <span className="text-sm font-semibold text-gray-900">₦{formatAmount(cashBalance)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Withdraw to</span>
              <button
                onClick={() => router.push('/dashboard/admin/wallet/select-bank')}
                className="flex items-center gap-1 text-sm font-medium text-[#FF6B35]"
              >
                {selectedBank ? selectedBank.bank_name : 'NGN Bank Account'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} onClick={() => handleNumberPress(num.toString())} className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
              <span className="text-xl sm:text-2xl font-semibold text-gray-900">{num}</span>
            </button>
          ))}
          <button onClick={handleDot} className="aspect-square bg-white rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
            <span className="text-xl sm:text-2xl font-semibold text-gray-900">.</span>
          </button>
          <button onClick={() => handleNumberPress('0')} className="aspect-square bg-white rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
            <span className="text-xl sm:text-2xl font-semibold text-gray-900">0</span>
          </button>
          <button onClick={handleBackspace} className="aspect-square bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-800 active:scale-95 transition-all">
            <span className="text-white text-xl font-bold">&#x232B;</span>
          </button>
        </div>
      </main>

      <div className="sticky bottom-0 px-4 sm:px-6 py-4 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleContinue}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full py-4 rounded-full font-semibold text-lg transition-colors ${amount && parseFloat(amount) > 0 ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
