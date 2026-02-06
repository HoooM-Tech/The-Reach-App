'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { WalletTransactionsList } from '@/components/wallet/WalletTransactionsList';
import { WalletLoadingState } from '@/components/wallet/WalletLoadingState';

export default function CreatorWalletPage() {
  const router = useRouter();
  const { balance, transactions, isLoading } = useWallet();
  const [showSetupModal, setShowSetupModal] = useState(false);

  React.useEffect(() => {
    if (balance && !balance.isSetup) {
      setShowSetupModal(true);
    }
  }, [balance]);

  if (isLoading) {
    return <WalletLoadingState />;
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <WalletBalanceCard
          balance={balance}
          role="creator"
          onWithdraw={() => {
            if (balance?.isSetup) {
              router.push('/dashboard/creator/wallet/withdraw');
            } else {
              setShowSetupModal(true);
            }
          }}
        />

        <WalletTransactionsList
          transactions={transactions}
          viewAllPath="/dashboard/creator/wallet/transactions"
          role="creator"
        />
      </main>

      {/* Setup Prompt Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-6" />
            
            <div className="px-6 pb-6">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">✕</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup up your wallet</h2>

              <div
                onClick={() => {
                  setShowSetupModal(false);
                  router.push('/dashboard/creator/wallet/setup');
                }}
                className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Setup your wallet</p>
                  <p className="text-sm text-gray-600">
                    Enjoy all functionality from your wallet feature by completing your wallet setup
                  </p>
                </div>
                <ChevronRight size={20} className="text-orange-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
