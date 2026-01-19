'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ReviewTransferPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const fee = 100;
  const total = withdrawalAmount ? parseFloat(withdrawalAmount) + fee : 0;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Load withdrawal details
    const amount = localStorage.getItem('withdrawal-amount');
    const bank = localStorage.getItem('selected-bank-account');
    
    if (amount) setWithdrawalAmount(amount);
    if (bank) {
      try {
        setSelectedBank(JSON.parse(bank));
      } catch (e) {
        console.error('Failed to parse bank:', e);
      }
    }
  }, [user, userLoading, router]);

  const handleProceed = () => {
    router.push('/dashboard/developer/wallet/enter-pin');
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
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Review bank transfer</h1>
        <button
          aria-label="Notifications"
          title="Notifications"
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pt-8 pb-32">
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          {/* Bank Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Building2 size={40} className="text-gray-600" />
            </div>
          </div>

          {/* Transfer Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Destination</span>
              <span className="text-sm font-semibold text-gray-900">
                {selectedBank 
                  ? `${selectedBank.accountNumber.slice(0, 5)}***${selectedBank.accountNumber.slice(-2)} • ${selectedBank.bankName}`
                  : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Account Name:</span>
              <span className="text-sm font-semibold text-gray-900">
                {selectedBank?.accountName || 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Bank name:</span>
              <span className="text-sm font-semibold text-gray-900">
                {selectedBank?.bankName || 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Fee:</span>
              <span className="text-sm font-semibold text-gray-900">₦{fee.toLocaleString()}</span>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-gray-900">₦{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proceed Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 pb-8">
        <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-4 rounded-full"></div>
        <button
          onClick={handleProceed}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
        >
          Proceed
        </button>
      </div>
    </div>
  );
}


