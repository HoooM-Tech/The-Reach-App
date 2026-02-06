
import React, { useState } from 'react';
import { User, Property } from '../../types';
import PropertyCard from '../../components/dashboard/PropertyCard';
import { Bell, Menu, Search, SlidersHorizontal, Map } from 'lucide-react';

/**
 * @deprecated This component uses MOCK_PROPERTIES and appears to be legacy/unused.
 * The actual buyer dashboard is in app/dashboard/buyer/page.tsx which uses real APIs.
 * This component should be removed or updated to use real data from buyerApi.getDashboard().
 */
const MOCK_PROPERTIES: Property[] = [
  { 
    id: '1', 
    developer_id: 'd1',
    title: "4 Bedroom duplex Apartment", 
    description: "Modern duplex in the heart of Lekki.",
    listing_type: 'sale',
    visibility: 'all_creators',
    verification_status: 'verified',
    status: 'active',
    location: {
      address: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
    },
    asking_price: 20000000,
    media: [{ id: '1', url: "https://picsum.photos/600/400?random=111", type: 'image' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Property,
  { 
    id: '2',
    developer_id: 'd1',
    title: "3 Bedroom Flat", 
    description: "Luxury flat in prime location.",
    listing_type: 'sale',
    visibility: 'all_creators',
    verification_status: 'verified',
    status: 'active',
    location: {
      address: "Victoria Island",
      city: "Lagos",
      state: "Lagos",
    },
    asking_price: 35000000,
    media: [{ id: '2', url: "https://picsum.photos/600/400?random=112", type: 'image' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Property,
];

const BuyerDashboard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="pb-24 bg-reach-light min-h-screen overflow-x-hidden">
      <header className="px-4 sm:px-6 py-4 bg-white flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img src={(user as any)?.avatarUrl || '/placeholder-avatar.png'} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Location</p>
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-sm">Lagos, Nigeria</h1>
              <svg className="w-3 h-3 text-reach-red" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-50 p-2.5 rounded-full text-gray-500">
            <Bell size={20} />
          </button>
          <button className="bg-gray-50 p-2.5 rounded-full text-gray-500">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
             <input type="text" placeholder="Search homes, agents..." className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none shadow-sm" />
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
           </div>
           <button className="bg-reach-navy text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all w-full sm:w-auto">
             <SlidersHorizontal size={24} />
           </button>
        </div>

        <div className="flex items-center justify-between mb-2">
           <h2 className="text-xl font-bold text-reach-navy">Explore properties</h2>
           <button className="flex items-center gap-1.5 text-reach-red font-bold text-sm bg-red-50 px-4 py-2 rounded-full">
              <Map size={16} /> Map view
           </button>
        </div>

        <div className="space-y-6">
           {MOCK_PROPERTIES.map(p => (
             <PropertyCard key={p.id} property={p} />
           ))}
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
