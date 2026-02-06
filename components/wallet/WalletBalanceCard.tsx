'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { WalletBalance } from '@/hooks/useWallet';

interface WalletBalanceCardProps {
  balance: WalletBalance | null;
  role: 'creator' | 'developer';
  onWithdraw?: () => void;
  onAddFunds?: () => void;
  showAddFunds?: boolean;
}

export function WalletBalanceCard({
  balance,
  role,
  onWithdraw,
  onAddFunds,
  showAddFunds = false,
}: WalletBalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="mb-6">
        <p className="text-base text-gray-700 mb-2">Available Balance</p>
        <div className="flex items-center gap-3">
          <p className="text-4xl font-bold text-gray-900">
            {showBalance ? formatAmount(balance?.availableBalance || 0) : '₦ ****'}
          </p>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="w-6 h-6 flex items-center justify-center"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
          >
            {showBalance ? (
              <Eye size={24} className="text-gray-600" />
            ) : (
              <EyeOff size={24} className="text-gray-600" />
            )}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-base text-gray-700 mb-2">Locked Balance</p>
        <p className="text-xl font-semibold text-gray-900">
          {showBalance ? formatAmount(balance?.lockedBalance || 0) : '₦****'}
        </p>
      </div>

      <div className={`flex gap-3 ${showAddFunds ? '' : 'flex-col'}`}>
        {onWithdraw && (
          <button
            onClick={onWithdraw}
            className={`${showAddFunds ? 'flex-1' : 'w-full'} py-4 bg-[#1E3A5F] text-white rounded-full font-medium hover:bg-[#1E3A5F]/90 transition-colors`}
          >
            Withdraw
          </button>
        )}
        {showAddFunds && onAddFunds && (
          <button
            onClick={onAddFunds}
            className="flex-1 py-4 bg-white border-2 border-[#1E3A5F] text-[#1E3A5F] rounded-full font-medium hover:bg-[#1E3A5F]/5 transition-colors"
          >
            Add Funds
          </button>
        )}
      </div>
    </div>
  );
}
