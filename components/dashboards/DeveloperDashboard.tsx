
'use client';

import React, { useState } from 'react';
import { User, Property } from '../../types';
import PropertyCard from '../../components/dashboard/PropertyCard';
import StatCard from '../../components/dashboard/StatCard';
import { Plus, Bell, Menu, Search, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  user: User;
}

const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    developer_id: 'rob',
    title: "4 Bedroom duplex Apartment",
    description: "Modern duplex in the heart of Lekki.",
    listing_type: 'sale',
    visibility: 'all_creators',
    verification_status: 'verified',
    status: 'active',
    location: {
      address: "222A Freedom way, Lekki Phase 1, Lagos",
      city: "Lagos",
      state: "Lagos",
    },
    asking_price: 20000000,
    media: [{ id: '1', url: "https://picsum.photos/600/400?random=101", type: 'image' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Property,
  {
    id: '2',
    developer_id: 'rob',
    title: "Minimalist Modern Flat",
    description: "Luxury at its finest.",
    listing_type: 'sale',
    visibility: 'all_creators',
    verification_status: 'rejected',
    status: 'draft',
    location: {
      address: "Banana Island, Ikoyi, Lagos",
      city: "Lagos",
      state: "Lagos",
    },
    asking_price: 45000000,
    media: [{ id: '2', url: "https://picsum.photos/600/400?random=102", type: 'image' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Property,
  {
    id: '3',
    developer_id: 'rob',
    title: "Studio Loft",
    description: "Perfect for young professionals.",
    listing_type: 'sale',
    visibility: 'all_creators',
    verification_status: 'pending_verification',
    status: 'active',
    location: {
      address: "Victoria Island, Lagos",
      city: "Lagos",
      state: "Lagos",
    },
    asking_price: 15000000,
    media: [{ id: '3', url: "https://picsum.photos/600/400?random=103", type: 'image' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Property,
];

const DeveloperDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('All');
  const router = useRouter();

  return (
    <div className="pb-24 bg-reach-light min-h-screen">
      <header className="p-6 bg-white flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img src={(user as any)?.avatarUrl || '/placeholder-avatar.png'} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Welcome back, {user.name?.split(' ')[0] || 'User'}</p>
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-sm">{(user as any)?.companyName || 'Company'}</h1>
              <div className="w-3 h-3 bg-reach-red rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L9 10.586l3.293-3.293a1 1 0 011.414 1.414z" /></svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/notifications')} className="bg-gray-50 p-2.5 rounded-full text-gray-500 hover:text-reach-navy">
            <Bell size={20} />
          </button>
          <button className="bg-gray-50 p-2.5 rounded-full text-gray-500">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by name, status..." 
            className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-1 ring-reach-red/20"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-50 p-1.5 rounded-lg text-gray-400">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <StatCard label="Total Listing" value="23" change="+20%" />
           <StatCard label="Active Listing" value="20" change="+20%" />
           <StatCard label="Pending Verif." value="3" change="+10%" />
           <StatCard label="Total Leads" value="40" change="+15%" />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Verified', 'Rejected', 'Pending'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab ? 'bg-reach-navy text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-4">
           {MOCK_PROPERTIES
            .filter(p => {
              const status = p.verification_status || p.status || '';
              if (activeTab === 'All') return true;
              if (activeTab === 'Verified') return status === 'verified';
              if (activeTab === 'Rejected') return status === 'rejected';
              if (activeTab === 'Pending') return status === 'pending_verification' || status === 'submitted';
              return true;
            })
            .map(property => (
             <PropertyCard key={property.id} property={property} />
           ))}
        </div>
      </div>

      <button className="fixed bottom-24 right-6 w-14 h-14 bg-reach-navy text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 z-40">
        <Plus size={28} />
      </button>
    </div>
  );
};

export default DeveloperDashboard;
