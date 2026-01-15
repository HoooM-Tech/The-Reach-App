'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AddBankPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [bankName, setBankName] = useState('United Bank of Africa');
  const [accountNumber, setAccountNumber] = useState('1234567890');
  const [accountName, setAccountName] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, userLoading, router]);

  const handleVerify = async () => {
    setVerifying(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setAccountName('Robinson Kingsley Chinagorom');
    setIsVerified(true);
    setVerifying(false);
  };

  const handleProceed = () => {
    if (isVerified && accountName) {
      // Save bank account
      const savedAccounts = localStorage.getItem('bank-accounts');
      const accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
      const newAccount = {
        id: Date.now().toString(),
        bankName,
        accountName,
        accountNumber
      };
      accounts.push(newAccount);
      localStorage.setItem('bank-accounts', JSON.stringify(accounts));
      router.push('/dashboard/developer/wallet/select-bank');
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
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Add bank account</h1>
        <button
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pt-6 pb-32">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {/* Verified Account Name Display */}
          {isVerified && accountName && (
            <div className="bg-gray-100 rounded-full px-4 py-3 flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF6B35] to-orange-500 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white"></div>
              </div>
              <p className="text-sm font-semibold text-gray-900">{accountName}</p>
            </div>
          )}

          {/* Bank Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#FF6B35] rounded-xl focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
              placeholder="Enter bank name"
            />
          </div>

          {/* Account Number Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setAccountNumber(value);
                setIsVerified(false);
                setAccountName('');
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
              placeholder="Enter account number"
              maxLength={10}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={isVerified ? handleProceed : handleVerify}
            disabled={verifying || !bankName || accountNumber.length !== 10}
            className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
              (bankName && accountNumber.length === 10 && !verifying)
                ? 'bg-reach-navy text-white hover:bg-reach-navy/90'
                : 'bg-gray-300 text-white cursor-not-allowed'
            }`}
          >
            {verifying ? 'Verifying...' : isVerified ? 'Proceed' : 'Verify account'}
          </button>
        </div>
      </div>
    </div>
  );
}


