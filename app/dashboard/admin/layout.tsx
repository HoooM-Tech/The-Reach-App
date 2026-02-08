'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { AdminGuard } from '@/components/auth/RoleGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { profileApi } from '@/lib/api/client';
import { 
  LayoutDashboard, 
  Users, 
  Building2,
  CreditCard,
  ArrowUpCircle,
  AlertTriangle,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  User,
  FileText,
  TrendingUp
} from 'lucide-react';

// ===========================================
// Admin Navigation Items
// ===========================================

const getAdminNavItems = (
  pendingProperties?: number,
  pendingWithdrawals?: number,
  openDisputes?: number
) => [
  { label: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
  { 
    label: 'Users', 
    href: '/dashboard/admin/users', 
    icon: Users 
  },
  { 
    label: 'Properties', 
    href: '/dashboard/admin/properties', 
    icon: Building2,
    badge: pendingProperties 
  },
  { 
    label: 'Transactions', 
    href: '/dashboard/admin/transactions', 
    icon: CreditCard 
  },
  { 
    label: 'Withdrawals', 
    href: '/dashboard/admin/withdrawals', 
    icon: ArrowUpCircle,
    badge: pendingWithdrawals 
  },
  { 
    label: 'Disputes', 
    href: '/dashboard/admin/disputes', 
    icon: AlertTriangle,
    badge: openDisputes 
  },
  { 
    label: 'Analytics', 
    href: '/dashboard/admin/analytics', 
    icon: BarChart3 
  },
  { 
    label: 'Payouts', 
    href: '/dashboard/admin/payouts', 
    icon: Wallet 
  },
  { 
    label: 'My Wallet', 
    href: '/dashboard/admin/wallet', 
    icon: CreditCard 
  },
  { 
    label: 'Settings', 
    href: '/dashboard/admin/settings', 
    icon: Settings 
  },
];

const ADMIN_ACCOUNT_ITEMS = [
  { label: 'Profile', href: '/dashboard/admin/profile', icon: User },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

// ===========================================
// Admin Layout Component
// ===========================================

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const [profileData, setProfileData] = useState<{ avatar_url?: string | null } | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<{
    pendingProperties?: number;
    pendingWithdrawals?: number;
    openDisputes?: number;
  }>({});

  // Fetch profile data
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

  // Fetch badge counts
  const fetchBadgeCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setBadgeCounts({
          pendingProperties: data.properties?.pending_verification || 0,
          pendingWithdrawals: data.financial?.pending_payouts || 0,
          openDisputes: 0, // Will be fetched from disputes endpoint
        });
      }
    } catch (err) {
      console.error('Failed to load badge counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchBadgeCounts();
  }, [fetchProfile, fetchBadgeCounts]);

  // Transform user data to match DashboardShell props format
  const userProps = user ? {
    name: user.full_name || user.email || 'Admin',
    companyName: 'Platform Administrator',
    avatarUrl: profileData?.avatar_url || (user as any)?.avatar_url || undefined,
  } : undefined;

  // Get navigation items with badge counts
  const navItems = getAdminNavItems(
    badgeCounts.pendingProperties,
    badgeCounts.pendingWithdrawals,
    badgeCounts.openDisputes
  );

  // Add logout handler to account items
  const accountItemsWithLogout = [
    ...ADMIN_ACCOUNT_ITEMS,
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
      basePath="/dashboard/admin"
    >
      {children}
    </DashboardShell>
  );
}

// ===========================================
// Exported Layout with Role Guard
// ===========================================

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminGuard>
  );
}
