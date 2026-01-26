'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, Check } from 'lucide-react';
import { walletApi } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function WalletSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'pin' | 'confirm' | 'success'>('pin');
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if wallet is already set up
  useEffect(() => {
    const checkWalletSetup = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch('/api/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          const responseData = await response.json();
          const walletData = responseData.data || responseData;
          const isSetup = walletData.is_setup !== undefined ? walletData.is_setup : walletData.isSetup || false;

          if (isSetup) {
            // Wallet is already set up, redirect to main wallet page
            router.push('/dashboard/creator/wallet');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking wallet setup:', error);
        // Continue with setup if check fails
      } finally {
        setIsChecking(false);
      }
    };

    checkWalletSetup();
  }, [router]);

  const handlePinInput = (value: string, index: number, isConfirm = false) => {
    if (!/^\d$/.test(value) && value !== '') return;

    const targetArray = isConfirm ? confirmPin : pin;
    const targetRefs = isConfirm ? confirmPinInputRefs : pinInputRefs;
    const setTarget = isConfirm ? setConfirmPin : setPin;

    const newPin = [...targetArray];
    newPin[index] = value;
    setTarget(newPin);

    // Move to next input
    if (value && index < 3) {
      targetRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }

    // Auto-submit when all 4 digits are entered
    if (!isConfirm && newPin.every(d => d !== '') && newPin.join('').length === 4) {
      setTimeout(() => {
        setStep('confirm');
        setActiveIndex(0);
        setTimeout(() => confirmPinInputRefs.current[0]?.focus(), 100);
      }, 200);
    }

    if (isConfirm && newPin.every(d => d !== '') && newPin.join('').length === 4) {
      // Check if PINs match
      if (newPin.join('') === pin.join('')) {
        handleSubmit(newPin.join(''));
      } else {
        toast.error('PINs do not match');
        setConfirmPin(['', '', '', '']);
        setActiveIndex(0);
        confirmPinInputRefs.current[0]?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, isConfirm = false) => {
    const targetArray = isConfirm ? confirmPin : pin;
    const targetRefs = isConfirm ? confirmPinInputRefs : pinInputRefs;
    const setTarget = isConfirm ? setConfirmPin : setPin;

    if (e.key === 'Backspace' && !targetArray[index] && index > 0) {
      targetRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    } else if (e.key === 'Backspace' && targetArray[index]) {
      const newPin = [...targetArray];
      newPin[index] = '';
      setTarget(newPin);
    }
  };

  const handleNumberClick = (num: string) => {
    if (step === 'pin') {
      if (activeIndex < 4 && pin[activeIndex] === '') {
        handlePinInput(num, activeIndex, false);
      }
    } else if (step === 'confirm') {
      if (activeIndex < 4 && confirmPin[activeIndex] === '') {
        handlePinInput(num, activeIndex, true);
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'pin') {
      const lastFilledIndex = pin.findIndex((d, i) => d === '' && i > 0) - 1;
      const indexToClear = lastFilledIndex >= 0 ? lastFilledIndex : 3;
      if (pin[indexToClear]) {
        const newPin = [...pin];
        newPin[indexToClear] = '';
        setPin(newPin);
        setActiveIndex(indexToClear);
        pinInputRefs.current[indexToClear]?.focus();
      }
    } else if (step === 'confirm') {
      const lastFilledIndex = confirmPin.findIndex((d, i) => d === '' && i > 0) - 1;
      const indexToClear = lastFilledIndex >= 0 ? lastFilledIndex : 3;
      if (confirmPin[indexToClear]) {
        const newPin = [...confirmPin];
        newPin[indexToClear] = '';
        setConfirmPin(newPin);
        setActiveIndex(indexToClear);
        confirmPinInputRefs.current[indexToClear]?.focus();
      }
    }
  };

  const handleSubmit = async (finalPin: string) => {
    if (finalPin.length !== 4) return;

    setIsSubmitting(true);
    try {
      await walletApi.setup(finalPin, finalPin);
      setStep('success');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set up wallet');
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setStep('pin');
      setActiveIndex(0);
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue = step === 'pin' 
    ? pin.every(d => d !== '') && pin.join('').length === 4
    : confirmPin.every(d => d !== '') && confirmPin.join('') === pin.join('');

  useEffect(() => {
    if (step === 'pin') {
      pinInputRefs.current[0]?.focus();
    } else if (step === 'confirm') {
      confirmPinInputRefs.current[0]?.focus();
    }
  }, [step]);

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-30 h-30 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">You&apos;re all set!</h1>
          <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-xs mx-auto">
            Your Reach wallet is created. Now let&apos;s go find you a property? a room? or a commission? go exploring on Reach
          </p>
          <button
            onClick={() => router.push('/dashboard/creator/wallet')}
            className="w-full py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors"
          >
            Let&apos;s go
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while checking wallet setup
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking wallet status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="bg-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            title="Back"
            aria-label="Back"
            onClick={() => router.back()}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
          >
            <ChevronLeft size={24} className="text-gray-900" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Set up wallet</h1>
          <button aria-label="Notifications" title="Notifications" className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Enter 4-digits PIN here</h2>
          <p className="text-base text-gray-600 mb-8">Choose a four digits PIN for your transaction.</p>

          {/* PIN Input Boxes */}
          <div className="flex gap-3 mb-8">
            {[0, 1, 2, 3].map((index) => (
              <input
                title="PIN input"
                aria-label="PIN input"
                key={index}
                ref={(el) => {
                  if (step === 'pin') {
                    pinInputRefs.current[index] = el;
                  } else {
                    confirmPinInputRefs.current[index] = el;
                  }
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={step === 'pin' ? pin[index] : confirmPin[index]}
                onChange={(e) => handlePinInput(e.target.value, index, step === 'confirm')}
                onKeyDown={(e) => handleKeyDown(e, index, step === 'confirm')}
                onFocus={() => setActiveIndex(index)}
                className={`w-16 h-16 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none ${
                  activeIndex === index
                    ? 'border-orange-500'
                    : 'border-gray-300'
                }`}
                style={{ caretColor: activeIndex === index ? 'transparent' : 'auto' }}
              />
            ))}
          </div>

          {step === 'confirm' && (
            <>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Retype PIN</h3>
              <div className="flex gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    title="PIN input"
                    aria-label="PIN input"
                    key={index}
                    ref={(el) => {
                      confirmPinInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={confirmPin[index]}
                    onChange={(e) => handlePinInput(e.target.value, index, true)}
                    onKeyDown={(e) => handleKeyDown(e, index, true)}
                    onFocus={() => setActiveIndex(index)}
                    className={`w-16 h-16 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none ${
                      activeIndex === index
                        ? 'border-orange-500'
                        : 'border-gray-300'
                    }`}
                    style={{ caretColor: activeIndex === index ? 'transparent' : 'auto' }}
                  />
                ))}
              </div>
            </>
          )}

          <button
            onClick={() => {
              if (step === 'pin' && canContinue) {
                setStep('confirm');
                setActiveIndex(0);
                setTimeout(() => confirmPinInputRefs.current[0]?.focus(), 100);
              } else if (step === 'confirm' && canContinue) {
                handleSubmit(confirmPin.join(''));
              }
            }}
            disabled={!canContinue || isSubmitting}
            className={`w-full py-4 rounded-full font-medium mt-8 ${
              canContinue
                ? 'bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } transition-colors`}
          >
            Continue
          </button>
        </div>

        {/* Numeric Keypad */}
        <div className="bg-gray-100 rounded-2xl p-4">
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
      </main>
    </div>
  );
}
