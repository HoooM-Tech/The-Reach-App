'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function BuyerEnterPinPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userLoading && !user) { router.push('/login'); return; }
    const amount = sessionStorage.getItem('withdrawal-amount');
    const bank = sessionStorage.getItem('withdrawal-bank');
    if (!amount || !bank) router.push('/dashboard/buyer/wallet/withdraw');
  }, [user, userLoading, router]);

  const processWithdrawal = useCallback(async (enteredPin: string) => {
    const amount = sessionStorage.getItem('withdrawal-amount');
    const bankData = sessionStorage.getItem('withdrawal-bank');

    if (!amount || !bankData) {
      toast.error('Missing withdrawal details');
      router.push('/dashboard/buyer/wallet/withdraw');
      return;
    }

    let bank;
    try { bank = JSON.parse(bankData); } catch {
      toast.error('Invalid bank details');
      router.push('/dashboard/buyer/wallet/withdraw');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      const response = await fetch('/api/buyer/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(amount),
          bankAccountId: bank.id,
          pin: enteredPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || data.error || 'Withdrawal failed';
        throw new Error(errorMsg);
      }

      if (data.success) {
        const txData = data.data?.transaction || {};
        sessionStorage.setItem('withdrawal-transaction', JSON.stringify({
          id: txData.id,
          reference: txData.reference,
          amount: txData.amount || parseFloat(amount),
          fee: txData.fee || 100,
          net_amount: txData.net_amount,
          status: txData.status || 'processing',
          accountName: txData.account_name || bank.account_name,
          bankName: txData.bank_name || bank.bank_name,
          accountNumber: bank.account_number,
        }));

        toast.success('Withdrawal initiated successfully!');
        router.push('/dashboard/buyer/wallet/withdrawal-success');
      } else {
        throw new Error(data.error || 'Withdrawal failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      toast.error(msg);
      setPin('');
    } finally {
      setIsProcessing(false);
    }
  }, [router]);

  const handleNumberPress = useCallback((num: string) => {
    if (isProcessing) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');
      if (newPin.length === 4) processWithdrawal(newPin);
    }
  }, [pin, isProcessing, processWithdrawal]);

  const handleBackspace = useCallback(() => {
    if (isProcessing) return;
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, [isProcessing]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="bg-transparent px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Enter PIN to Pay</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <div className="px-4 sm:px-6 pt-6 pb-8 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">Enter your 4-digit PIN</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">Enter your wallet PIN to confirm this withdrawal</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-center mb-6">
            {[0, 1, 2, 3].map((index) => {
              const value = pin[index] || '';
              const isActive = pin.length === index;
              return (
                <div
                  key={index}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center transition-colors ${
                    isActive ? 'border-orange-500 bg-orange-500/5' : value ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
                  } ${error ? 'border-red-300' : ''}`}
                >
                  {value ? <div className="w-3 h-3 rounded-full bg-gray-900" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} onClick={() => handleNumberPress(num.toString())} disabled={isProcessing} className="aspect-square bg-white rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50">
              <span className="text-xl sm:text-2xl font-semibold text-gray-900">{num}</span>
            </button>
          ))}
          <div />
          <button onClick={() => handleNumberPress('0')} disabled={isProcessing} className="aspect-square bg-white rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50">
            <span className="text-xl sm:text-2xl font-semibold text-gray-900">0</span>
          </button>
          <button onClick={handleBackspace} disabled={isProcessing} className="aspect-square bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
            <span className="text-white text-xl font-bold">&#x232B;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
