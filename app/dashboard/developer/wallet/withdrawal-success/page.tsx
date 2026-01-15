'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function WithdrawalSuccessPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState<any>(null);

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
    <div className="min-h-screen bg-[#FDFBFA] flex flex-col items-center justify-center px-6">
      {/* Success Icon */}
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
        <Check size={48} className="text-white" />
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Withdrawal Initiated</h2>
      <p className="text-center text-gray-600 mb-12 max-w-sm">
        Your withdrawal of <span className="font-semibold text-gray-900">₦{withdrawalAmount ? parseFloat(withdrawalAmount).toLocaleString() : '0'}</span> has been initiated to your bank account ({selectedBank ? `${selectedBank.accountNumber.slice(0, 3)}*******${selectedBank.accountNumber.slice(-2)}/${selectedBank.bankName}` : 'N/A'})
      </p>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => router.push('/dashboard/developer/wallet/transactions')}
          className="w-full bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors"
        >
          View Transaction
        </button>
        <button
          onClick={() => router.push('/dashboard/developer/wallet')}
          className="w-full bg-white border-2 border-gray-200 text-gray-900 font-semibold py-4 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <span>Done</span>
        </button>
      </div>
    </div>
  );
}


