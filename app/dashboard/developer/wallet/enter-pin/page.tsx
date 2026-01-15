'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export const dynamic = 'force-dynamic';

export default function EnterPinPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, userLoading, router]);

  const handleNumberPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Verify PIN after 4 digits
        setTimeout(() => {
          const savedPin = localStorage.getItem('wallet-pin');
          if (newPin === savedPin) {
            // PIN correct, proceed to success
            router.push('/dashboard/developer/wallet/withdrawal-success');
          } else {
            alert('Incorrect PIN. Please try again.');
            setPin('');
          }
        }, 300);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-navy border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Enter PIN to pay</h1>
        
        {/* PIN Indicators */}
        <div className="flex gap-3 justify-center mb-12">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full ${
                pin[index] ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 px-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberPress(num.toString())}
              className="aspect-square bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl font-semibold text-gray-900">{num}</span>
            </button>
          ))}
          
          <div></div>
          <button
            onClick={() => handleNumberPress('0')}
            className="aspect-square bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl font-semibold text-gray-900">0</span>
          </button>
          <button
            onClick={handleBackspace}
            className="aspect-square bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <span className="text-white text-xl font-bold">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}


