'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { CreatorGuard } from '@/components/auth/RoleGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { profileApi, ApiError } from '@/lib/api/client';
import { 
  LayoutDashboard, 
  Link2, 
  TrendingUp, 
  Wallet, 
  Settings, 
  User,
  HelpCircle,
  Building2
} from 'lucide-react';

// ===========================================
// Creator Navigation Items
// ===========================================

const CREATOR_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard/creator', icon: LayoutDashboard },
  { label: 'Properties', href: '/dashboard/creator/properties', icon: Building2 },
  { label: 'My Links', href: '/dashboard/creator/links', icon: Link2 },
  { label: 'Analytics', href: '/dashboard/creator/analytics', icon: TrendingUp },
  { label: 'Wallet', href: '/wallet', icon: Wallet },
];

const CREATOR_ACCOUNT_ITEMS = [
  { label: 'Profile', href: '/dashboard/creator/profile', icon: User },
  { label: 'Settings & Privacy', href: '/dashboard/creator/settings', icon: Settings },
  { label: 'Help Center', href: '/dashboard/creator/help', icon: HelpCircle },
];

// ===========================================
// Creator Layout Component
// ===========================================

function CreatorLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [profileData, setProfileData] = useState<{ avatar_url?: string | null; company_name?: string | null } | null>(null);

  // Fetch profile data to get avatar and company name
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await profileApi.getProfile();
      setProfileData({
        avatar_url: response.profile.avatar_url,
        company_name: response.profile.company_name || user.full_name || 'Creator',
      });
    } catch (err) {
      console.error('Failed to load profile for layout:', err);
      // Continue without profile data
    }
  }, [user?.id, user?.full_name]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Transform user data to match DashboardShell props format
  const userProps = user ? {
    name: user.full_name || user.email || 'User',
    companyName: profileData?.company_name || (user as any)?.company_name || (user as any)?.companyName || 'Creator',
    avatarUrl: profileData?.avatar_url || (user as any)?.avatar_url || (user as any)?.avatarUrl || undefined,
  } : undefined;

  return (
    <DashboardShell 
      user={userProps}
      navItems={CREATOR_NAV_ITEMS}
      accountItems={CREATOR_ACCOUNT_ITEMS}
      basePath="/dashboard/creator"
    >
      {children}
    </DashboardShell>
  );
}

// ===========================================
// Exported Layout with Role Guard
// ===========================================

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreatorGuard>
      <CreatorLayoutContent>{children}</CreatorLayoutContent>
    </CreatorGuard>
  );
}
