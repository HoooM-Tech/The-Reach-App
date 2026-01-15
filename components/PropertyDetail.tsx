
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
// Fixed: Added missing Eye and Users icon imports from lucide-react
import { ChevronLeft, Bell, MoreHorizontal, MapPin, Bed, Bath, Move, Star, Info, MessageSquare, Eye, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PropertyDetail: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Overview');

  // Simulated data
  const property = {
    title: "4 Bedroom duplex Apartment",
    location: "222A Freedom way, Lekki Phase 1, Lagos",
    price: 20000000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 1400,
    status: 'Verified',
    desc: "Experience luxury in this exquisitely designed 4-bedroom duplex. Featuring state-of-the-art amenities, sprawling living spaces, and a prime location in Lekki Phase 1.",
    imageUrl: "https://picsum.photos/800/600?random=201"
  };

  return (
    <div className="pb-32 bg-reach-light min-h-screen">
      <div className="relative h-80">
        <img src={property.imageUrl} alt="property" className="w-full h-full object-cover" />
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
           <button onClick={() => router.back()} className="p-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full text-white">
              <ChevronLeft size={24} />
           </button>
           <div className="flex gap-3">
              <button className="p-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full text-white">
                <Bell size={22} />
              </button>
              <button className="p-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full text-white">
                <MoreHorizontal size={22} />
              </button>
           </div>
        </div>
        <div className="absolute top-4 left-6 mt-16 px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm border border-green-200">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
           {property.status}
        </div>
      </div>

      <div className="bg-white -mt-10 rounded-t-[40px] p-8 shadow-2xl relative z-10 min-h-screen">
         <div className="flex justify-between items-start mb-6">
            <div>
               <div className="px-4 py-2 bg-green-50 text-green-600 rounded-2xl text-lg font-bold inline-block mb-3">
                  ₦{property.price.toLocaleString()}M
               </div>
               <h1 className="text-2xl font-bold text-reach-navy leading-tight">{property.title}</h1>
               <div className="flex items-center gap-1.5 text-reach-red mt-2">
                  <MapPin size={16} />
                  <p className="text-sm font-medium">{property.location}</p>
               </div>
            </div>
            <div className="flex flex-col items-center gap-1 text-reach-orange">
               <Star size={20} fill="currentColor" />
               <span className="text-sm font-bold">4.8(20)</span>
            </div>
         </div>

         <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="flex items-center gap-2 text-gray-400">
               <Bed size={20} />
               <span className="text-sm font-bold">{property.bedrooms} Beds</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
               <Bath size={20} />
               <span className="text-sm font-bold">{property.bathrooms} Bath</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
               <Move size={20} />
               <span className="text-sm font-bold">{property.sqft} sqft</span>
            </div>
         </div>

         <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3">
            <Info size={20} className="text-reach-orange shrink-0 mt-0.5" />
            <p className="text-xs text-reach-orange font-medium leading-relaxed">
              This property is currently verified and open for inspections. Exclusive listers have priority access.
            </p>
         </div>

         <div className="mb-8">
            <h3 className="font-bold text-lg mb-3">Performance Stats</h3>
            <div className="flex gap-8">
               <div className="flex items-center gap-2 text-gray-500">
                  <Eye size={18} />
                  <span className="font-bold">156 views</span>
               </div>
               <div className="flex items-center gap-2 text-gray-500">
                  <Users size={18} />
                  <span className="font-bold">10 leads</span>
               </div>
            </div>
         </div>

         <div className="mb-8">
            <h3 className="font-bold text-lg mb-3">Description</h3>
            <p className="text-sm text-gray-500 leading-loose">{property.desc}</p>
         </div>

         <div className="space-y-4">
            <h3 className="font-bold text-lg">Contract Status</h3>
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
               <span className="text-sm text-gray-400">Ready for signing</span>
               <button className="text-reach-navy font-bold underline text-sm">View contract</button>
            </div>
         </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white p-6 pb-8 border-t border-gray-100 flex gap-4 z-50">
          <button className="flex-1 border-2 border-reach-navy text-reach-navy py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
             <MessageSquare size={20} /> Chat
          </button>
          <button className="flex-[2] bg-reach-navy text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
             Book Inspection
          </button>
      </div>
    </div>
  );
};

export default PropertyDetail;
