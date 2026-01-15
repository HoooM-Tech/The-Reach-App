
'use client';

import React, { useState } from 'react';
import { User, Transaction } from '../types';
// Fixed: Added missing Wallet import from lucide-react
import { ChevronLeft, Bell, Menu, Eye, EyeOff, ArrowUpRight, Plus, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', wallet_id: 'w1', type: 'deposit', amount: 2000, created_at: new Date().toISOString(), status: 'completed', description: 'Madebyrobb' },
  { id: '2', wallet_id: 'w1', type: 'deposit', amount: 2000, created_at: new Date().toISOString(), status: 'completed', description: 'Madebyrobb' },
  { id: '3', wallet_id: 'w1', type: 'deposit', amount: 2000, created_at: new Date().toISOString(), status: 'completed', description: 'Madebyrobb' }
];

const WalletPage: React.FC<{ user: User }> = ({ user }) => {
  const [showBalance, setShowBalance] = useState(true);
  const router = useRouter();

  return (
    <div className="pb-24 bg-reach-light min-h-screen">
       <header className="p-6 bg-white flex items-center justify-between sticky top-0 z-40 border-b border-gray-50">
        <div className="flex items-center gap-4">
           <button onClick={() => router.back()} className="p-2.5 rounded-full bg-gray-50" aria-label="Go back">
              <ChevronLeft size={20} />
           </button>
           <h1 className="text-lg font-bold">Wallet</h1>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-50 p-2.5 rounded-full text-gray-500" aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button className="bg-gray-50 p-2.5 rounded-full text-gray-500" aria-label="Menu">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="p-6">
         <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center mb-8">
            <p className="text-gray-400 text-sm font-medium mb-1">Total Balance</p>
            <div className="flex items-center gap-3 mb-8">
               <h2 className="text-4xl font-bold text-reach-navy">
                 {showBalance ? '₦ 10,500.00' : '₦ ****'}
               </h2>
               <button onClick={() => setShowBalance(!showBalance)} className="text-gray-400" aria-label={showBalance ? "Hide balance" : "Show balance"}>
                 {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
               </button>
            </div>

            <div className="flex gap-4 w-full">
               <button className="flex-1 bg-reach-navy text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                  Withdraw
               </button>
               <button className="flex-1 bg-reach-light text-reach-navy font-bold py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Plus size={18} /> Add funds
               </button>
            </div>
         </div>

         <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl mb-8 flex items-center justify-between cursor-pointer active:scale-95 transition-all">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Wallet size={20} className="text-blue-500" />
               </div>
               <div>
                  <h4 className="font-bold text-sm">Setup your wallet</h4>
                  <p className="text-xs text-gray-400">Complete your wallet setup to unlock more features</p>
               </div>
            </div>
            <ChevronLeft size={20} className="rotate-180 text-gray-400" />
         </div>

         <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Recent transactions</h3>
            <button className="text-xs text-reach-navy font-bold">View all</button>
         </div>

         <div className="space-y-4">
            {MOCK_TRANSACTIONS.map(tx => (
               <div key={tx.id} className="bg-white p-5 rounded-3xl flex items-center justify-between shadow-sm border border-gray-50">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-reach-orange">
                        <ArrowUpRight size={24} className="rotate-[225deg]" />
                     </div>
                     <div>
                        <h5 className="font-bold text-reach-navy">{tx.description}</h5>
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(tx.created_at).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="font-bold text-reach-navy">+{tx.amount.toLocaleString()}</p>
                     <div className="w-4 h-4 rounded-full border-2 border-green-500 border-t-transparent animate-spin ml-auto mt-1" />
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default WalletPage;
