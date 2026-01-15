
'use client';

import React from 'react';
import { User } from '../../types';
import StatCard from '../../components/dashboard/StatCard';
import { Bell, Menu, Share2, Award, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CreatorDashboard: React.FC<{ user: User }> = ({ user }) => {
  const router = useRouter();

  return (
    <div className="pb-24 bg-reach-light min-h-screen">
      <header className="p-6 bg-white flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img src={(user as any)?.avatarUrl || '/placeholder-avatar.png'} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Creator Hub</p>
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-sm">{user.name}</h1>
              <div className="px-2 py-0.5 bg-reach-navy text-white text-[8px] font-bold rounded-full">TIER 1</div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/notifications')} className="bg-gray-50 p-2.5 rounded-full text-gray-500">
            <Bell size={20} />
          </button>
          <button className="bg-gray-50 p-2.5 rounded-full text-gray-500">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-br from-reach-navy to-reach-navy/80 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-blue-200 text-xs font-bold tracking-widest uppercase mb-1">Total Earned</p>
              <h2 className="text-3xl font-bold mb-6">₦10,500,000</h2>
              <button 
                onClick={() => router.push('/wallet')}
                className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/20"
              >
                Go to Wallet <ArrowRight size={16} />
              </button>
           </div>
           <Award className="absolute bottom-[-20px] right-[-20px] w-48 h-48 text-white/5 rotate-12" />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <StatCard label="Total Clicks" value="1.2k" change="+12%" />
           <StatCard label="Total Leads" value="145" change="+5%" />
           <StatCard label="Conversions" value="12" change="+2%" />
           <StatCard label="Avg. Commission" value="2.5%" change="+0%" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Active Promotions</h3>
              <button className="text-xs font-bold text-reach-navy">Manage all</button>
           </div>
           <div className="space-y-4">
              {[1, 2].map(i => (
                 <div key={i} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-xl overflow-hidden">
                          <img src={`https://picsum.photos/100?random=${i+10}`} className="w-full h-full object-cover" />
                       </div>
                       <div>
                          <h4 className="font-bold text-sm text-reach-navy">Lekki Duplex Ext.</h4>
                          <p className="text-[10px] text-gray-400">₦20M · 5% Comm.</p>
                       </div>
                    </div>
                    <button className="bg-reach-navy/5 p-2 rounded-xl text-reach-navy">
                       <Share2 size={18} />
                    </button>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
