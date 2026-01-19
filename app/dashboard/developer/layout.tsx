'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { DeveloperGuard } from '@/components/auth/RoleGuard';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { profileApi, ApiError } from '@/lib/api/client';

// ===========================================
// Developer Layout Component
// ===========================================

function DeveloperLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [profileData, setProfileData] = useState<{ avatar_url?: string | null; company_name?: string | null } | null>(null);

  // Fetch profile data to get avatar and company name
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await profileApi.getProfile();
      setProfileData({
        avatar_url: response.profile.avatar_url,
        company_name: response.profile.company_name,
      });
    } catch (err) {
      console.error('Failed to load profile for layout:', err);
      // Continue without profile data
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Transform user data to match DashboardShell props format
  const userProps = user ? {
    name: user.full_name || user.email || 'User',
    companyName: profileData?.company_name || (user as any).company_name || (user as any).companyName || 'Company',
    avatarUrl: profileData?.avatar_url || (user as any).avatar_url || (user as any).avatarUrl || undefined,
  } : undefined;

  return (
    <DashboardShell user={userProps}>
      {children}
    </DashboardShell>
  );
}

// ===========================================
// Exported Layout with Role Guard
// ===========================================

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return (
    <DeveloperGuard>
      <DeveloperLayoutContent>{children}</DeveloperLayoutContent>
    </DeveloperGuard>
  );
}


