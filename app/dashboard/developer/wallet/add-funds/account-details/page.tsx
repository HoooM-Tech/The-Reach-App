'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Copy, Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AccountDetailsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [copied, setCopied] = useState(false);
  const accountNumber = '1234567890';
  const accountName = '₦1,000'; // As shown in the design
  const bankName = 'Sterling Bank';
  const fee = 100;

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, userLoading, router]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
        <h1 className="text-lg font-semibold text-gray-900">Naira account details</h1>
        <button
          onClick={() => router.push('/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pt-6 pb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Naira account details</h2>
          <p className="text-sm text-gray-600 mb-6">
            Fund your Naira Wallet by Making a direct transfer from any bank
          </p>

          {/* Account Details */}
          <div className="space-y-4">
            {/* Account Number */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{accountNumber}</span>
                <button
                  onClick={handleCopy}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  {copied ? (
                    <Check size={16} className="text-green-600" />
                  ) : (
                    <Copy size={16} className="text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Account Name */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Account Name:</span>
              <span className="text-sm font-semibold text-gray-900">{accountName}</span>
            </div>

            {/* Bank Name */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Bank name:</span>
              <span className="text-sm font-semibold text-gray-900">{bankName}</span>
            </div>

            {/* Fee */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">Fee:</span>
              <span className="text-sm font-semibold text-gray-900">₦{fee.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


