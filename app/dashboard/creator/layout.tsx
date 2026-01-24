'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { CreatorGuard } from '@/components/auth/RoleGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { profileApi, ApiError } from '@/lib/api/client';
import { 
  LayoutDashboard, 
  Flag, 
  TrendingUp, 
  Wallet, 
  Settings, 
  HelpCircle,
  Building2,
  LogOut,
  User
} from 'lucide-react';
import { creatorApi } from '@/lib/api/client';

// ===========================================
// Creator Navigation Items
// ===========================================

// Navigation items will be populated with badge counts dynamically
const getCreatorNavItems = (promotionsBadge?: number, analyticsBadge?: number) => [
  { label: 'Dashboard', href: '/dashboard/creator', icon: LayoutDashboard },
  { label: 'Browse properties', href: '/dashboard/creator/properties', icon: Building2 },
  { label: 'My promotions', href: '/dashboard/creator/my-promotions', icon: Flag, badge: promotionsBadge },
  { label: 'Analytics', href: '/dashboard/creator/analytics', icon: TrendingUp, badge: analyticsBadge },
  { label: 'Wallet', href: '/dashboard/creator/wallet', icon: Wallet },
];

const CREATOR_ACCOUNT_ITEMS = [
  { label: 'Profile', href: '/dashboard/creator/profile', icon: User },
  { label: 'Settings', href: '/dashboard/creator/settings', icon: Settings },
];

// ===========================================
// Creator Layout Component
// ===========================================

function CreatorLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const [profileData, setProfileData] = useState<{ avatar_url?: string | null; company_name?: string | null } | null>(null);
  const [dashboardData, setDashboardData] = useState<{ promotionsCount?: number; analyticsCount?: number } | null>(null);

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

  // Fetch dashboard data to get badge counts
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const dashboard = await creatorApi.getDashboard(user.id);
      // Badge counts:
      // - Promotions: Show count of active properties being promoted
      // - Analytics: Show count of new insights/updates (backend should provide this)
      // For now, showing badges when there are active promotions
      // TODO: Backend should provide analytics_badge_count for new insights/updates
      const promotionsCount = dashboard.promoting.active_properties > 0 
        ? dashboard.promoting.active_properties 
        : undefined;
      
      // Analytics badge: placeholder - backend should provide analytics_badge_count
      // For now, showing badge if there are leads (indicating activity)
      const analyticsCount = dashboard.performance.total_leads > 0 
        ? (dashboard.performance.total_leads > 1 ? 2 : 1) 
        : undefined;
      
      setDashboardData({
        promotionsCount,
        analyticsCount,
      });
    } catch (err) {
      console.error('Failed to load dashboard data for badges:', err);
      // Continue without badge data
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
    fetchDashboardData();
  }, [fetchProfile, fetchDashboardData]);

  // Transform user data to match DashboardShell props format
  const userProps = user ? {
    name: user.full_name || user.email || 'User',
    companyName: profileData?.company_name || (user as any)?.company_name || (user as any)?.companyName || 'Creator',
    avatarUrl: profileData?.avatar_url || (user as any)?.avatar_url || (user as any)?.avatarUrl || undefined,
    tier: user.tier || 1,
  } : undefined;

  // Get navigation items with badge counts
  const navItems = getCreatorNavItems(dashboardData?.promotionsCount, dashboardData?.analyticsCount);

  // Add logout handler to account items
  const accountItemsWithLogout = [
    ...CREATOR_ACCOUNT_ITEMS,
    { 
      label: 'Logout', 
      href: '#', 
      icon: LogOut,
      onClick: async () => {
        await logout();
        window.location.href = '/auth/login';
      }
    },
  ];

  return (
    <DashboardShell 
      user={userProps}
      navItems={navItems}
      accountItems={accountItemsWithLogout}
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
