'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

function calculateFee(amount: number): number {
  const percentageFee = amount * 0.015;
  const totalFee = percentageFee + 100;
  return Math.min(totalFee, 2000);
}

export default function BuyerAddFundsCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();

  const [amount, setAmount] = useState('0.00');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
  }, [user, userLoading, router]);

  useEffect(() => {
    const ref = searchParams.get('reference');
    if (ref) {
      verifyPayment(ref);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const res = await fetch('/api/buyer/wallet/add-funds/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reference }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payment successful! Wallet credited.');
        router.push('/dashboard/buyer/wallet');
      }
    } catch {
      toast.error('Verification failed');
    }
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
  };

  const handleContinue = async () => {
    const fundAmount = parseFloat(amount);

    if (fundAmount < 100) {
      toast.error('Minimum amount is ₦100');
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch('/api/buyer/wallet/add-funds/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: fundAmount }),
      });

      const data = await response.json();

      if (data.success && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.error(data.error || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-3 flex items-center justify-between bg-white">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Add Funds</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <div className="px-4 pt-6 pb-32">
        <div className="bg-white rounded-2xl p-6 shadow-sm min-h-[320px] flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <input
              type="text"
              inputMode="decimal"
              value={amount ? `₦${amount}` : ''}
              onChange={(e) => handleAmountChange(e.target.value.replace('₦', '').trim())}
              className="text-5xl font-bold text-center w-full border-none outline-none bg-transparent"
              placeholder="₦0.00"
            />
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Payment method</span>
              <span className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Card Payment
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Processing fee</span>
              <span className="font-semibold">
                ₦{calculateFee(parseFloat(amount) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200">
        <button
          onClick={handleContinue}
          disabled={parseFloat(amount) < 100 || isProcessing}
          className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg disabled:opacity-50 disabled:bg-gray-300 transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
