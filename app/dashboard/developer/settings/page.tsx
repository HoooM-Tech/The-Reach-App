'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
  }, [user, userLoading, router]);

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.')) {
      // TODO: Implement account deletion API call
      alert('Account deletion requested. This feature will be implemented with backend integration.');
    }
  };

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
      {/* Header is handled by DashboardShell */}
      
      {/* Main Content */}
      <div className="px-4 pb-8 space-y-6">
        {/* Account Settings Group */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => router.push('/dashboard/developer/profile')}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Profile</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          
          <button
            onClick={() => router.push('/dashboard/developer/settings/change-password')}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Change Password</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          
          <button
            onClick={() => router.push('/dashboard/developer/settings/notifications')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Notification</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Support Group */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => router.push('/dashboard/developer/settings/help')}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Help Center</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          
          <button
            onClick={() => {
              // TODO: Open review modal or external link
              alert('Review feature coming soon');
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Write a Review</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Legal Group */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => {
              // TODO: Open Terms of Use page/modal
              window.open('/terms-of-use', '_blank');
            }}
            className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Terms of Use</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
          
          <button
            onClick={() => {
              // TODO: Open Privacy Policy page/modal
              window.open('/privacy-policy', '_blank');
            }}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Privacy Policy</span>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Delete Account Button */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleDeleteAccount}
            className="w-full text-center text-red-600 font-semibold py-3 hover:text-red-700 transition-colors"
          >
            Delete my Account
          </button>
        </div>
      </div>
    </div>
  );
}
