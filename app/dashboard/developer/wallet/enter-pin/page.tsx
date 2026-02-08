'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function EnterPinPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Verify we have withdrawal data
    const amount = sessionStorage.getItem('withdrawal-amount');
    const bank = sessionStorage.getItem('withdrawal-bank');
    if (!amount || !bank) {
      router.push('/dashboard/developer/wallet/withdraw');
    }
  }, [user, userLoading, router]);

  const processWithdrawal = useCallback(async (enteredPin: string) => {
    const amount = sessionStorage.getItem('withdrawal-amount');
    const bankData = sessionStorage.getItem('withdrawal-bank');

    if (!amount || !bankData) {
      toast.error('Missing withdrawal details');
      router.push('/dashboard/developer/wallet/withdraw');
      return;
    }

    let bank;
    try {
      bank = JSON.parse(bankData);
    } catch {
      toast.error('Invalid bank details');
      router.push('/dashboard/developer/wallet/withdraw');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      const response = await fetch('/api/wallet/withdraw', {
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
        // Store transaction data for success page
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
        router.push('/dashboard/developer/wallet/withdrawal-success');
      } else {
        throw new Error(data.error || 'Withdrawal failed');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
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

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        setTimeout(() => processWithdrawal(newPin), 300);
      }
    }
  }, [pin, isProcessing, processWithdrawal]);

  const handleBackspace = useCallback(() => {
    if (isProcessing) return;
    setPin(pin.slice(0, -1));
    setError('');
  }, [pin, isProcessing]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-3xl w-full max-w-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
            {isProcessing ? 'Processing...' : 'Enter PIN to pay'}
          </h1>

          {/* PIN Indicators */}
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > index
                    ? 'bg-gray-900 border-gray-900'
                    : 'border-gray-300 bg-transparent'
                } ${isProcessing ? 'animate-pulse' : ''}`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-center text-red-500 text-sm mb-4">{error}</p>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberPress(num.toString())}
                disabled={isProcessing}
                className="aspect-square border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="text-xl sm:text-2xl font-semibold text-gray-900">{num}</span>
              </button>
            ))}

            <div /> {/* Empty cell */}
            <button
              onClick={() => handleNumberPress('0')}
              disabled={isProcessing}
              className="aspect-square border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="text-xl sm:text-2xl font-semibold text-gray-900">0</span>
            </button>
            <button
              onClick={handleBackspace}
              disabled={isProcessing}
              className="aspect-square border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="text-gray-900 text-lg font-bold">&#x232B;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Home Indicator */}
      <div className="pb-4 flex justify-center">
        <div className="h-1 bg-white/50 w-32 rounded-full" />
      </div>
    </div>
  );
}
