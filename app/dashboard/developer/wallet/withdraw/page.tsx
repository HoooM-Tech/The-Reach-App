'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function WithdrawPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const cashBalance = 10500.00;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Load selected bank account
    const savedBank = localStorage.getItem('selected-bank-account');
    if (savedBank) {
      try {
        setSelectedBank(JSON.parse(savedBank));
      } catch (e) {
        console.error('Failed to parse selected bank:', e);
      }
    }
  }, [user, userLoading, router]);

  const handleNumberPress = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount === '0' && num !== '.') {
      setAmount(num);
    } else {
      const newAmount = amount + num;
      const numericValue = parseFloat(newAmount);
      if (!isNaN(numericValue) && numericValue <= cashBalance) {
        setAmount(newAmount);
      }
    }
  };

  const handleBackspace = () => {
    setAmount(amount.slice(0, -1));
  };

  const handleContinue = () => {
    const numericAmount = parseFloat(amount);
    if (numericAmount > 0 && numericAmount <= cashBalance && selectedBank) {
      // Store withdrawal details
      localStorage.setItem('withdrawal-amount', amount);
      router.push('/dashboard/developer/wallet/review-transfer');
    }
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
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#FDFBFA] px-6 py-4 flex items-center justify-between z-50">
        <button
          aria-label="Back"
          title="Back"
          onClick={() => router.push('/dashboard/developer/wallet')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Withdraw from Wallet</h1>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content - with padding-top to account for fixed header */}
      <div className="px-6 pt-24 pb-32 max-w-2xl mx-auto">
        {/* Amount Display */}
        <div className="text-center mb-12">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            ₦{amount || '0.00'}
            {amount && <span className="animate-pulse">|</span>}
          </div>
        </div>

        {/* Withdrawal Details */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">Cash balance</span>
            <span className="text-sm font-semibold text-gray-900">₦{cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <button
            onClick={() => router.push('/dashboard/developer/wallet/select-bank')}
            className="flex items-center justify-between py-3 w-full"
          >
            <span className="text-sm text-gray-600">Withdraw to</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#FF6B35]">
                {selectedBank ? `${selectedBank.bankName} • ${selectedBank.accountNumber.slice(-4)}` : 'NGN Bank Account'}
              </span>
              <ChevronRight size={18} className="text-gray-400" />
            </div>
          </button>
        </div>

        {/* Numeric Keypad - Matching Figma Design */}
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100">
            <div className="grid grid-cols-3 gap-3">
              {/* Numbers 1-9 */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberPress(num.toString())}
                  className="aspect-square bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md hover:from-white hover:to-[#F9FAFB] active:scale-95 transition-all duration-150 group"
                >
                  <span className="text-2xl md:text-3xl font-bold text-gray-900 group-active:scale-90 transition-transform">
                    {num}
                  </span>
                </button>
              ))}
              
              {/* Bottom Row: Decimal, Zero, Backspace */}
              <button
                onClick={() => handleNumberPress('.')}
                className="aspect-square bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md hover:from-white hover:to-[#F9FAFB] active:scale-95 transition-all duration-150 group"
              >
                <span className="text-2xl md:text-3xl font-bold text-gray-900 group-active:scale-90 transition-transform">.</span>
              </button>
              <button
                onClick={() => handleNumberPress('0')}
                className="aspect-square bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md hover:from-white hover:to-[#F9FAFB] active:scale-95 transition-all duration-150 group"
              >
                <span className="text-2xl md:text-3xl font-bold text-gray-900 group-active:scale-90 transition-transform">0</span>
              </button>
              <button
                onClick={handleBackspace}
                className="aspect-square bg-gradient-to-br from-[#111827] to-[#1F2937] rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg hover:from-[#1F2937] hover:to-[#374151] active:scale-95 transition-all duration-150 group"
              >
                <span className="text-white text-xl md:text-2xl font-bold group-active:scale-90 transition-transform">×</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button - Light Gray Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F3F4F6] rounded-t-3xl p-4 pb-6">
        <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-3 rounded-full"></div>
        <button
          onClick={handleContinue}
          disabled={!amount || parseFloat(amount) <= 0 || !selectedBank}
          className={`w-full py-2.5 rounded-2xl font-semibold transition-colors ${
            amount && parseFloat(amount) > 0 && selectedBank
              ? 'bg-reach-navy text-white hover:bg-reach-navy/90'
              : 'bg-gray-300 text-white cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}


