
import React from 'react';
import { TrendingUp } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  change: string;
}

const StatCard: React.FC<Props> = ({ label, value, change }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center mb-4 text-gray-400">
       {/* Simple SVG icon based on label */}
       {label.includes('Listing') && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
       {label.includes('Leads') && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
    </div>
    <p className="text-xs text-gray-400 font-medium">{label}</p>
    <div className="flex items-end justify-between mt-1">
      <h3 className="text-2xl font-bold text-reach-navy">{value}</h3>
      <div className="flex items-center text-green-500 text-[10px] font-bold mb-1">
         <TrendingUp size={12} className="mr-0.5" />
         {change}
      </div>
    </div>
    <p className="text-[10px] text-gray-300 mt-1">From last 30 days</p>
  </div>
);

export default StatCard;
