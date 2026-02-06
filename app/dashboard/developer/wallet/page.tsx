'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { WalletTransactionsList } from '@/components/wallet/WalletTransactionsList';
import { WalletLoadingState } from '@/components/wallet/WalletLoadingState';

export default function DeveloperWalletPage() {
  const router = useRouter();
  const { balance, transactions, isLoading } = useWallet();

  if (isLoading) {
    return <WalletLoadingState />;
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <WalletBalanceCard
          balance={balance}
          role="developer"
          onWithdraw={() => {
            if (balance?.isSetup) {
              router.push('/dashboard/developer/wallet/withdraw');
            } else {
              router.push('/dashboard/developer/wallet/setup-pin');
            }
          }}
          onAddFunds={() => router.push('/dashboard/developer/wallet/add-funds')}
          showAddFunds={true}
        />

        <WalletTransactionsList
          transactions={transactions}
          viewAllPath="/dashboard/developer/wallet/transactions"
          role="developer"
        />
      </main>
    </div>
  );
}

