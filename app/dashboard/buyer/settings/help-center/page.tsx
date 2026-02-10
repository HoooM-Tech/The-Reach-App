'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HelpCenterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-3 flex items-center justify-between bg-white shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 text-[#000000]" />
        </button>
        <h1 className="text-lg font-semibold text-[#000000]">Help Center</h1>
        <button
          type="button"
          onClick={() => router.push('/dashboard/notifications')}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6 text-[#000000]" />
        </button>
      </header>

      <div className="px-4 pt-6">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/help-center/contact')}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-[#E5E7EB] hover:bg-gray-50"
          >
            <span className="text-base font-medium text-[#000000]">Contact Us</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/help-center/faq')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-base font-medium text-[#000000]">Frequently Asked Questions</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>
      </div>
    </div>
  );
}
