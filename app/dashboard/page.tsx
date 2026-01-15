'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

/**
 * Dashboard Router
 * 
 * This page redirects users to their role-specific dashboard.
 * NO shared dashboard - strict role isolation is enforced.
 * 
 * Developer → /dashboard/developer
 * Creator → /dashboard/creator
 * Buyer → /dashboard/buyer
 * Admin → /admin/properties (or admin dashboard)
 */

const ROLE_DASHBOARDS = {
  developer: '/dashboard/developer',
  creator: '/dashboard/creator',
  buyer: '/dashboard/buyer',
  admin: '/admin/properties',
} as const;

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useUser();

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    // Redirect to role-specific dashboard
    const role = user.role as keyof typeof ROLE_DASHBOARDS;
    const targetDashboard = ROLE_DASHBOARDS[role];

    if (targetDashboard) {
      router.replace(targetDashboard);
    } else {
      // Unknown role - redirect to login with error
      console.error('Unknown user role:', role);
      router.replace('/login?error=invalid_role');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading spinner while determining auth state and redirecting
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFBFA]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-[#0A1628]/20 border-t-[#0A1628] animate-spin" />
        </div>
        <p className="text-[#0A1628] font-medium">Loading your dashboard...</p>
      </div>
    </div>
  );
}
