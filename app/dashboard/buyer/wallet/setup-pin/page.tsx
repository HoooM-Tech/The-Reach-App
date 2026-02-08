'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function BuyerSetupPinPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [pin, setPin] = useState('');
  const [retypePin, setRetypePin] = useState('');
  const [step, setStep] = useState<'enter' | 'retype'>('enter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
  }, [user, userLoading, router]);

  const handleNumberPress = useCallback((num: string) => {
    if (isSubmitting) return;
    if (step === 'enter') {
      if (pin.length < 4) {
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 4) setTimeout(() => setStep('retype'), 300);
      }
    } else {
      if (retypePin.length < 4) setRetypePin(retypePin + num);
    }
  }, [step, pin, retypePin, isSubmitting]);

  const handleBackspace = useCallback(() => {
    if (isSubmitting) return;
    if (step === 'enter') setPin(pin.slice(0, -1));
    else {
      if (retypePin.length > 0) setRetypePin(retypePin.slice(0, -1));
      else { setStep('enter'); setPin(pin.slice(0, -1)); }
    }
  }, [step, pin, retypePin, isSubmitting]);

  const handleContinue = useCallback(async () => {
    if (step === 'enter' && pin.length === 4) { setStep('retype'); return; }
    if (step === 'retype' && retypePin.length === 4) {
      if (pin !== retypePin) {
        toast.error('PINs do not match. Please try again.');
        setRetypePin(''); setPin(''); setStep('enter');
        return;
      }
      try {
        setIsSubmitting(true);
        const response = await fetch('/api/buyer/wallet/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ pin, confirmPin: retypePin }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to set up wallet');
        if (data.success) {
          toast.success('Wallet set up successfully!');
          router.push('/dashboard/buyer/wallet/setup-pin/success');
        } else throw new Error(data.error || 'Failed to set up wallet');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something went wrong.');
        setRetypePin(''); setPin(''); setStep('enter');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [step, pin, retypePin, router]);

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
        <h1 className="text-lg font-semibold text-gray-900">Set up wallet</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <div className="px-4 sm:px-6 pt-6 pb-8 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {step === 'enter' ? 'Enter 4-digits PIN here' : 'Retype PIN'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {step === 'enter' ? 'Choose a four digits PIN for your transaction.' : 'Please retype your PIN to confirm.'}
          </p>

          <div className="flex gap-3 justify-center mb-8">
            {[0, 1, 2, 3].map((index) => {
              const currentPin = step === 'enter' ? pin : retypePin;
              const value = currentPin[index] || '';
              const isActive = step === 'enter' ? pin.length === index : retypePin.length === index;
              return (
                <div
                  key={index}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center transition-colors ${
                    isActive ? 'border-orange-500 bg-orange-500/5' : value ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
                  }`}
                >
                  {value ? <div className="w-3 h-3 rounded-full bg-gray-900" /> : null}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={isSubmitting || (step === 'enter' && pin.length !== 4) || (step === 'retype' && retypePin.length !== 4)}
            className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
              !isSubmitting && ((step === 'enter' && pin.length === 4) || (step === 'retype' && retypePin.length === 4))
                ? 'bg-[#1A3B5D] text-white hover:bg-[#1A3B5D]/90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Setting up...' : 'Continue'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} onClick={() => handleNumberPress(num.toString())} disabled={isSubmitting} className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50">
              <span className="text-xl sm:text-2xl font-semibold text-gray-900">{num}</span>
            </button>
          ))}
          <div />
          <button onClick={() => handleNumberPress('0')} disabled={isSubmitting} className="aspect-square bg-white rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50">
            <span className="text-xl sm:text-2xl font-semibold text-gray-900">0</span>
          </button>
          <button onClick={handleBackspace} disabled={isSubmitting} className="aspect-square bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50">
            <span className="text-white text-xl font-bold">&#x232B;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
