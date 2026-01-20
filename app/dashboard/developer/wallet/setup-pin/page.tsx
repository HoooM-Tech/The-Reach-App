'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SetupPinPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [pin, setPin] = useState('');
  const [retypePin, setRetypePin] = useState('');
  const [step, setStep] = useState<'enter' | 'retype'>('enter');

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, userLoading, router]);

  const handleNumberPress = (num: string) => {
    if (step === 'enter') {
      if (pin.length < 4) {
        setPin(pin + num);
        if (pin.length === 3) {
          // After 4 digits, move to retype step
          setTimeout(() => setStep('retype'), 300);
        }
      }
    } else {
      if (retypePin.length < 4) {
        setRetypePin(retypePin + num);
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else {
      if (retypePin.length > 0) {
        setRetypePin(retypePin.slice(0, -1));
      } else {
        setStep('enter');
        setPin(pin.slice(0, -1));
      }
    }
  };

  const handleContinue = () => {
    if (step === 'enter' && pin.length === 4) {
      setStep('retype');
    } else if (step === 'retype' && retypePin.length === 4) {
      if (pin === retypePin) {
        // Save PIN to localStorage (in production, this would be encrypted)
        localStorage.setItem('wallet-pin', pin);
        localStorage.setItem('wallet-setup-complete', 'true');
        router.push('/dashboard/developer/wallet');
      } else {
        alert('PINs do not match. Please try again.');
        setRetypePin('');
        setPin('');
        setStep('enter');
      }
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
      {/* Header */}
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          aria-label="Back"
          title="Back"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Set up wallet</h1>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pt-6 pb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {step === 'enter' ? 'Enter 4-digits PIN here' : 'Retype PIN'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {step === 'enter' 
              ? 'Choose a four digits PIN for your transaction.'
              : 'Please retype your PIN to confirm.'}
          </p>

          {/* PIN Input Fields */}
          <div className="flex gap-3 justify-center mb-8">
            {[0, 1, 2, 3].map((index) => {
              const currentPin = step === 'enter' ? pin : retypePin;
              const value = currentPin[index] || '';
              const isActive = step === 'enter' 
                ? pin.length === index 
                : retypePin.length === index;
              
              return (
                <div
                  key={index}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center ${
                    isActive 
                      ? 'border-[#FF6B35] bg-[#FF6B35]/5' 
                      : value 
                        ? 'border-gray-300 bg-gray-50' 
                        : 'border-gray-200'
                  }`}
                >
                  {value ? (
                    <div className="w-3 h-3 rounded-full bg-gray-900"></div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={
              (step === 'enter' && pin.length !== 4) ||
              (step === 'retype' && retypePin.length !== 4)
            }
            className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
              (step === 'enter' && pin.length === 4) ||
              (step === 'retype' && retypePin.length === 4)
                ? 'bg-reach-navy text-white hover:bg-reach-navy/90'
                : 'bg-gray-300 text-white cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberPress(num.toString())}
              className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl font-semibold text-gray-900">{num}</span>
              {num === 2 && <span className="text-xs text-gray-400 mt-0.5">ABC</span>}
              {num === 3 && <span className="text-xs text-gray-400 mt-0.5">DEF</span>}
              {num === 4 && <span className="text-xs text-gray-400 mt-0.5">GHI</span>}
              {num === 5 && <span className="text-xs text-gray-400 mt-0.5">JKL</span>}
              {num === 6 && <span className="text-xs text-gray-400 mt-0.5">MNO</span>}
              {num === 7 && <span className="text-xs text-gray-400 mt-0.5">PQRS</span>}
              {num === 8 && <span className="text-xs text-gray-400 mt-0.5">TUV</span>}
              {num === 9 && <span className="text-xs text-gray-400 mt-0.5">WXYZ</span>}
            </button>
          ))}
          
          <div></div>
          <button
            onClick={() => handleNumberPress('0')}
            className="aspect-square bg-white rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl font-semibold text-gray-900">0</span>
          </button>
          <button
            onClick={handleBackspace}
            className="aspect-square bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-800 transition-colors"
          >
            <span className="text-white text-xl font-bold">×</span>
          </button>
        </div>
      </div>

      {/* Home Indicator */}
      <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-2 rounded-full"></div>
    </div>
  );
}


