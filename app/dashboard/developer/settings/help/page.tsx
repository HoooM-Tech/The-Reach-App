'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HelpCenterPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-primary border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="bg-transparent px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Help Center</h1>
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => {
              // TODO: Navigate to contact form or open email
              window.location.href = 'mailto:support@reach.app?subject=Support Request';
            }}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Contact Us</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          
          <button
            onClick={() => {
              // TODO: Navigate to FAQ page
              router.push('/dashboard/developer/settings/help/faq');
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Frequently Asked Questions</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
