
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '../../types';
import { ChevronLeft } from 'lucide-react';

const roles: Array<{ id: UserRole; title: string; description: string }> = [
  { id: 'developer', title: "I am a developer/ Agency", description: "Listers and property managers" },
  { id: 'creator', title: "I am a creator", description: "Promoters and lead generators" },
  { id: 'buyer', title: "I am a buyer", description: "Property seekers and investors" }
];

const RoleSelection: React.FC = () => {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const router = useRouter();

  return (
    <div className="h-screen bg-reach-light flex flex-col">
      <div className="p-6">
        <button onClick={() => router.push('/')} className="bg-white p-2 rounded-full shadow-sm">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="flex-1 px-8">
        <h2 className="text-2xl font-bold text-reach-navy mt-4">Welcome to Reach, Pick your role.</h2>
        <p className="text-gray-500 mt-2 mb-8">Select your role to personalize your experience.</p>

        <div className="space-y-4">
          {roles.map((role) => (
            <div 
              key={role.id}
              onClick={() => setSelected(role.id)}
              className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                selected === role.id ? 'border-reach-red bg-white' : 'border-gray-100 bg-white'
              }`}
            >
              <div>
                <h3 className="font-semibold text-lg">{role.title}</h3>
                <p className="text-sm text-gray-400">{role.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected === role.id ? 'border-reach-navy' : 'border-gray-300'}`}>
                {selected === role.id && <div className="w-3 h-3 bg-reach-navy rounded-full" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 pb-12">
        <button 
          disabled={!selected}
          onClick={() => {
            if (selected) {
              localStorage.setItem('temp_role', selected);
              if (selected === 'developer') {
                router.push('/register/developer');
              } else if (selected === 'creator') {
                router.push('/register/creator');
              } else if (selected === 'buyer') {
                router.push('/register/buyer');
              }
            }
          }}
          className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
            selected ? 'bg-reach-navy text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default RoleSelection;
