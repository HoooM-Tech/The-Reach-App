'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { 
  Settings, 
  User,
  Lock,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Link2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Settings Item Component
// ===========================================

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, label, description, onClick, danger }: SettingsItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-left shadow-sm ${
        danger ? 'hover:border-red-200' : ''
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        danger ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>{label}</p>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight className="text-gray-400" size={20} />
    </button>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function CreatorSettingsPage() {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xl">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{user?.full_name || 'Creator'}</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
              {user?.phone && (
                <p className="text-sm text-gray-500">{user.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Account</h2>
          <div className="space-y-2">
            <SettingsItem
              icon={<User size={20} />}
              label="Profile"
              description="Update your personal information"
              onClick={() => router.push('/dashboard/creator/profile')}
            />
            <SettingsItem
              icon={<Lock size={20} />}
              label="Change Password"
              description="Update your account password"
              onClick={() => router.push('/dashboard/creator/change-password')}
            />
            <SettingsItem
              icon={<Shield size={20} />}
              label="KYC Verification"
              description={user?.kyc_status === 'verified' ? 'Verified' : 'Complete your verification'}
              onClick={() => router.push('/dashboard/creator/kyc')}
            />
          </div>
        </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Promotion</h2>
            <div className="space-y-2">
              <SettingsItem
                icon={<Link2 size={20} />}
                label="Social Accounts"
                description="Link your social media accounts"
                onClick={() => router.push('/dashboard/creator/social')}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Preferences</h2>
            <div className="space-y-2">
              <SettingsItem
                icon={<Bell size={20} />}
                label="Notifications"
                description="Manage notification preferences"
                onClick={() => router.push('/dashboard/notifications')}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Other</h2>
            <div className="space-y-2">
              <SettingsItem
                icon={<LogOut size={20} />}
                label="Logout"
                description="Sign out of your account"
                onClick={handleLogout}
                danger
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

