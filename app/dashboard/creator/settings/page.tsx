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
      className={`w-full flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/20 transition-all text-left ${
        danger ? 'hover:border-red-500/30' : ''
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        danger ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</p>
        {description && (
          <p className="text-sm text-white/60 mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight className="text-white/40" size={20} />
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

  // Get tier badge
  const getTierBadge = (tier: number) => {
    const tiers: Record<number, { label: string; color: string }> = {
      1: { label: 'Bronze', color: 'bg-amber-600' },
      2: { label: 'Silver', color: 'bg-gray-400' },
      3: { label: 'Gold', color: 'bg-yellow-500' },
      4: { label: 'Platinum', color: 'bg-purple-600' },
    };
    return tiers[tier] || tiers[1];
  };

  const tierInfo = getTierBadge(user?.tier || 1);

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/60 text-sm mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Info */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'C'}
          </div>
          <div>
            <h3 className="font-semibold text-white">{user?.full_name || 'Creator'}</h3>
            <p className="text-sm text-white/60">{user?.email}</p>
            {user?.phone && (
              <p className="text-sm text-white/60">{user.phone}</p>
            )}
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium text-white ${tierInfo.color}`}>
              {tierInfo.label} Creator
            </span>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white/60 uppercase mb-3">Account</h2>
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
          <h2 className="text-sm font-semibold text-white/60 uppercase mb-3">Promotion</h2>
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
          <h2 className="text-sm font-semibold text-white/60 uppercase mb-3">Preferences</h2>
          <div className="space-y-2">
            <SettingsItem
              icon={<Bell size={20} />}
              label="Notifications"
              description="Manage notification preferences"
              onClick={() => router.push('/notifications')}
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white/60 uppercase mb-3">Other</h2>
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

