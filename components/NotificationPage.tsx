
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, Menu, CheckCircle2, Home, CreditCard } from 'lucide-react';

const NotificationPage: React.FC = () => {
  const router = useRouter();

  const notifications = [
    {
      id: '1',
      title: 'Deposit Cash',
      time: 'Yesterday, 1:05 PM',
      amount: '₦50,000',
      type: 'payment',
      icon: <CreditCard className="text-green-500" />,
      group: 'Yesterday'
    },
    {
      id: '2',
      title: 'Verified Property',
      time: 'Yesterday, 1:05 PM',
      desc: 'Your property has been successfully verified. Please review and sign the contract to activate.',
      type: 'system',
      icon: <Home className="text-blue-500" />,
      action: 'View contract',
      group: 'November 2025'
    },
    {
      id: '3',
      title: 'Bought Property',
      time: 'Yesterday, 1:05 PM',
      desc: 'Your property has been successfully sold out. Thank you for your patronage.',
      type: 'sale',
      icon: <CheckCircle2 className="text-green-600" />,
      action: 'See Transaction',
      group: 'November 2025'
    }
  ];

  return (
    <div className="pb-24 bg-reach-light min-h-screen">
      <header className="p-6 bg-white flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
           <button onClick={() => router.back()} className="p-2.5 rounded-full bg-gray-50">
              <ChevronLeft size={20} />
           </button>
           <h1 className="text-xl font-bold">Notifications</h1>
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

      <div className="p-6 space-y-8">
         {/* Simple grouping */}
         <section>
            <h2 className="text-xs font-bold text-gray-400 mb-4 tracking-widest uppercase">Yesterday</h2>
            <div className="space-y-4">
               {notifications.filter(n => n.group === 'Yesterday').map(n => (
                  <div key={n.id} className="bg-white p-5 rounded-3xl flex items-center justify-between border border-gray-50 shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">{n.icon}</div>
                        <div>
                           <h3 className="font-bold text-reach-navy">{n.title}</h3>
                           <p className="text-[10px] text-gray-400">{n.time}</p>
                        </div>
                     </div>
                     <p className="font-bold text-reach-navy">{n.amount}</p>
                  </div>
               ))}
            </div>
         </section>

         <section>
            <h2 className="text-xs font-bold text-gray-400 mb-4 tracking-widest uppercase">November 2025</h2>
            <div className="space-y-4">
               {notifications.filter(n => n.group === 'November 2025').map(n => (
                  <div key={n.id} className="bg-white p-5 rounded-3xl border border-gray-50 shadow-sm">
                     <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">{n.icon}</div>
                        <div>
                           <h3 className="font-bold text-reach-navy">{n.title}</h3>
                           <p className="text-[10px] text-gray-400">{n.time}</p>
                        </div>
                     </div>
                     <p className="text-xs text-gray-500 leading-relaxed mb-4">{n.desc}</p>
                     {n.action && (
                        <button className="text-xs font-bold text-reach-navy underline">{n.action}</button>
                     )}
                  </div>
               ))}
            </div>
         </section>
      </div>
    </div>
  );
};

export default NotificationPage;
