'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PrivacyPolicyPage() {
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
        <h1 className="text-lg font-semibold text-[#000000]">Privacy Policy</h1>
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
          <p className="text-base text-[#6B7280] leading-relaxed">
            Privacy Policy content. Load from your legal document or CMS.
          </p>
        </div>
      </div>
    </div>
  );
}
