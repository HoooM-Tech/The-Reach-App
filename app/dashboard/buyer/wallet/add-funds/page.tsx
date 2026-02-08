'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useEffect } from 'react';
import { ArrowLeft, Bell, CreditCard, Building2, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function BuyerAddFundsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) router.push('/login');
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#1A3B5D] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-3 flex items-center justify-between bg-white">
        <button aria-label="Back" title="Back" onClick={() => router.back()} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Add Funds</h1>
        <button aria-label="Notifications" title="Notifications" onClick={() => router.push('/dashboard/notifications')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      <div className="px-4 pt-6 pb-6">
        <p className="text-sm text-gray-600 mb-4">Choose payment method</p>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard/buyer/wallet/add-funds/card')}
            className="w-full bg-white rounded-xl p-5 flex items-center justify-between hover:bg-gray-50 transition shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Card Payment</p>
                <p className="text-sm text-gray-500">Pay with debit/credit card</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => router.push('/dashboard/buyer/wallet/add-funds/bank-transfer')}
            className="w-full bg-white rounded-xl p-5 flex items-center justify-between hover:bg-gray-50 transition shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Bank Transfer</p>
                <p className="text-sm text-gray-500">Transfer to wallet account</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
