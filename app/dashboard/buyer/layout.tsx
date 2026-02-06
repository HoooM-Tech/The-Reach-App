'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { BuyerGuard } from '@/components/auth/RoleGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { profileApi } from '@/lib/api/client';
import { 
  LayoutDashboard,
  Building2,
  Calendar,
  FileText,
  Bell,
  Wallet,
  User,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';

// ===========================================
// Types
// ===========================================

interface NotificationCounts {
  inspections: number;
  handovers: number;
  notifications: number;
}

// ===========================================
// Buyer Navigation Items
// ===========================================

const getBuyerNavItems = (counts?: NotificationCounts) => [
  { label: 'Home', href: '/dashboard/buyer', icon: LayoutDashboard },
  { label: 'Browse properties', href: '/properties', icon: Building2 },
  { label: 'My Inspections', href: '/dashboard/buyer/inspections', icon: Calendar, badge: counts?.inspections },
  { label: 'Handover', href: '/dashboard/buyer/handover', icon: FileText, badge: counts?.handovers },
  { label: 'Notification', href: '/dashboard/notifications', icon: Bell, badge: counts?.notifications },
  { label: 'Wallet', href: '/dashboard/buyer/wallet', icon: Wallet },
];

const BUYER_ACCOUNT_ITEMS = [
  { label: 'Settings', href: '/dashboard/buyer/settings', icon: Settings },
  { label: 'Help Center & Support', href: '/help', icon: HelpCircle },
];

// ===========================================
// Buyer Layout Component
// ===========================================

function BuyerLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const [profileData, setProfileData] = useState<{ avatar_url?: string | null } | null>(null);
  const [counts, setCounts] = useState<NotificationCounts>({
    inspections: 0,
    handovers: 0,
    notifications: 0,
  });

  // Fetch profile data to get avatar
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await profileApi.getProfile();
      setProfileData({
        avatar_url: response.profile.avatar_url,
      });
    } catch (err) {
      console.error('Failed to load profile for layout:', err);
    }
  }, [user?.id]);

  // Fetch notification counts for badges
  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/counts', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCounts(data);
      }
    } catch (err) {
      console.error('Failed to fetch notification counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchProfile, fetchCounts]);

  // Transform user data to match DashboardShell props format
  const userProps = user ? {
    name: user.full_name || user.email || 'User',
    companyName: user.full_name || 'Buyer',
    avatarUrl: profileData?.avatar_url || undefined,
  } : undefined;

  // Get navigation items with badge counts
  const navItems = getBuyerNavItems(counts);

  // Add logout handler to account items
  const accountItemsWithLogout = [
    ...BUYER_ACCOUNT_ITEMS,
    { 
      label: 'Log out', 
      href: '#', 
      icon: LogOut,
      onClick: async () => {
        await logout();
        window.location.href = '/';
      }
    },
  ];

  return (
    <DashboardShell 
      user={userProps}
      navItems={navItems}
      accountItems={accountItemsWithLogout}
      basePath="/dashboard/buyer"
    >
      {children}
    </DashboardShell>
  );
}

// ===========================================
// Exported Layout with Role Guard
// ===========================================

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <BuyerGuard>
      <BuyerLayoutContent>{children}</BuyerLayoutContent>
    </BuyerGuard>
  );
}
