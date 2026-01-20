'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Building2, CreditCard } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PaymentType = 'bank-transfer' | 'card' | null;

export default function PaymentTypePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, userLoading, router]);

  const handleSelectPaymentType = (type: 'bank-transfer' | 'card') => {
    setSelectedPaymentType(type);
    // Store payment type
    localStorage.setItem('payment-type', type);
    
    if (type === 'bank-transfer') {
      router.push('/dashboard/developer/wallet/add-funds/account-details');
    } else {
      // For card payment, you would navigate to card payment page
      alert('Card payment integration coming soon');
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
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      {/*
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          aria-label="Back"
          title="Back"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Select Payment type</h1>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/dashboard/notifications')} 
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>
      */}

      {/* Main Content */}
      <div className="px-6 pt-6 pb-8">
        <div className="space-y-4">
          {/* Direct Bank Transfer Option */}
          <button
            aria-label="Direct bank transfer"
            title="Direct bank transfer"
            onClick={() => handleSelectPaymentType('bank-transfer')}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={24} className="text-gray-700" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 mb-1">Direct bank transfer</p>
              <p className="text-sm text-gray-500">Fee: ₦100</p>
            </div>
          </button>

          {/* NGN Debit/Credit Card Option */}
          <button
            aria-label="NGN Debit/Credit Card"
            title="NGN Debit/Credit Card"
            onClick={() => handleSelectPaymentType('card')}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard size={24} className="text-gray-700" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 mb-1">NGN Debit/Credit Card</p>
              <p className="text-sm text-gray-500">Fee: ₦21</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}


