'use client';

import { useRouter } from 'next/navigation';
import { Bell, Menu, ChevronRight } from 'lucide-react';
import { buyerApi } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default function BuyerSettingsPage() {
  const router = useRouter();

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!confirmed) return;
    try {
      await buyerApi.deleteAccount();
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e: any) {
      alert(e?.message || 'Failed to delete account');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-6 flex items-center justify-between">
        <h1 className="text-[44px] font-bold text-[#000000]">Settings</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/notifications')}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-[#000000]" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/profile')}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6 text-[#000000]" />
          </button>
        </div>
      </header>

      <div className="px-4 pb-8 space-y-6">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/profile')}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-[#E5E7EB] hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#000000]">Profile</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/change-password')}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-[#E5E7EB] hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#000000]">Change Password</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/notifications')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#000000]">Notification</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/help-center')}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-[#E5E7EB] hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#000000]">Help Center</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/write-review')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#000000]">Write a Review</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/terms')}
            className="w-full px-5 py-4 flex items-center justify-between border-b border-[#E5E7EB] hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#000000]">Terms of Use</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/buyer/settings/privacy')}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <span className="text-base font-semibold text-[#000000]">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleDeleteAccount}
          className="w-full text-center py-3 text-[#EF4444] font-semibold text-base"
        >
          Delete my Account
        </button>
      </div>
    </div>
  );
}
