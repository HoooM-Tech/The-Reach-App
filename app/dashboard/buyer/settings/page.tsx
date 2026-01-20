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
  CreditCard,
  LogOut,
  ChevronRight
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
      className={`w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all text-left ${
        danger ? 'hover:border-red-200' : ''
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        danger ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
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

export default function BuyerSettingsPage() {
  const router = useRouter();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#E54D4D] rounded-full flex items-center justify-center text-white font-bold text-xl">
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'B'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user?.full_name || 'Buyer'}</h3>
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
              onClick={() => router.push('/dashboard/buyer/profile')}
            />
            <SettingsItem
              icon={<Lock size={20} />}
              label="Change Password"
              description="Update your account password"
              onClick={() => router.push('/dashboard/buyer/change-password')}
            />
            <SettingsItem
              icon={<Shield size={20} />}
              label="KYC Verification"
              description={user?.kyc_status === 'verified' ? 'Verified' : 'Complete your verification'}
              onClick={() => router.push('/dashboard/buyer/kyc')}
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
            <SettingsItem
              icon={<CreditCard size={20} />}
              label="Payment Methods"
              description="Manage your payment options"
              onClick={() => router.push('/dashboard/buyer/payment-methods')}
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
  );
}

