'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '../../contexts/UserContext';

// ===========================================
// Type Definitions
// ===========================================

type UserRole = 'developer' | 'creator' | 'buyer' | 'admin';

interface RoleGuardProps {
  children: React.ReactNode;
  /** Allowed roles for this route. Empty array = any authenticated user */
  allowedRoles: UserRole[];
  /** Custom redirect path if unauthorized. Defaults to role-appropriate dashboard */
  fallbackPath?: string;
}

// ===========================================
// Role-based routing configuration
// ===========================================

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  developer: '/dashboard/developer',
  creator: '/dashboard/creator',
  buyer: '/dashboard/buyer',
  admin: '/admin/properties',
};

const ROLE_LOGIN_REDIRECTS: Record<UserRole, string> = {
  developer: '/dashboard/developer',
  creator: '/dashboard/creator',
  buyer: '/dashboard/buyer',
  admin: '/admin/properties',
};

// ===========================================
// Loading Component
// ===========================================

function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFBFA]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-[#0A1628]/20 border-t-[#0A1628] animate-spin" />
        </div>
        <p className="text-[#0A1628] font-medium">{message}</p>
      </div>
    </div>
  );
}

// ===========================================
// Unauthorized Component
// ===========================================

function UnauthorizedScreen({ onRedirect }: { onRedirect: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRedirect, 2000);
    return () => clearTimeout(timer);
  }, [onRedirect]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFBFA]">
      <div className="flex flex-col items-center gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        <p className="text-sm text-gray-400">Redirecting you to the appropriate page...</p>
      </div>
    </div>
  );
}

// ===========================================
// Main Role Guard Component
// ===========================================

/**
 * RoleGuard - Strict role-based access control component
 * 
 * CRITICAL: This component enforces role isolation.
 * - Developers can ONLY access developer routes
 * - Creators can ONLY access creator routes  
 * - Buyers can ONLY access buyer routes
 * - No cross-role access is permitted
 * 
 * @example
 * // Developer-only route
 * <RoleGuard allowedRoles={['developer']}>
 *   <DeveloperDashboard />
 * </RoleGuard>
 * 
 * @example
 * // Multiple roles (admin can access all)
 * <RoleGuard allowedRoles={['developer', 'admin']}>
 *   <PropertyManagement />
 * </RoleGuard>
 */
export function RoleGuard({ children, allowedRoles, fallbackPath }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useUser();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
      return;
    }

    // Check role authorization
    const userRole = user.role as UserRole;
    const hasAccess = allowedRoles.includes(userRole) || allowedRoles.includes('admin');
    
    if (!hasAccess) {
      setIsAuthorized(false);
      return;
    }

    setIsAuthorized(true);
  }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname]);

  // Handle redirect for unauthorized users
  const handleUnauthorizedRedirect = () => {
    if (!user) {
      router.replace('/login');
      return;
    }
    
    const userRole = user.role as UserRole;
    const targetPath = fallbackPath || ROLE_DASHBOARDS[userRole] || '/';
    router.replace(targetPath);
  };

  // Loading state
  if (isLoading || isAuthorized === null) {
    return <LoadingScreen message="Verifying access..." />;
  }

  // Not authenticated - will redirect
  if (!isAuthenticated || !user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Unauthorized - show message then redirect
  if (isAuthorized === false) {
    return <UnauthorizedScreen onRedirect={handleUnauthorizedRedirect} />;
  }

  // Authorized - render children
  return <>{children}</>;
}

// ===========================================
// Convenience HOC
// ===========================================

/**
 * Higher-order component for role-based access control
 * 
 * @example
 * const ProtectedPage = withRoleGuard(MyComponent, ['developer']);
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  fallbackPath?: string
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard allowedRoles={allowedRoles} fallbackPath={fallbackPath}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

// ===========================================
// Role-specific Guard Components
// ===========================================

/** Guard for developer-only routes */
export function DeveloperGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['developer', 'admin']}>{children}</RoleGuard>;
}

/** Guard for creator-only routes */
export function CreatorGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['creator', 'admin']}>{children}</RoleGuard>;
}

/** Guard for buyer-only routes */
export function BuyerGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['buyer', 'admin']}>{children}</RoleGuard>;
}

/** Guard for admin-only routes */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['admin']}>{children}</RoleGuard>;
}

/** Guard for any authenticated user */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['developer', 'creator', 'buyer', 'admin']}>{children}</RoleGuard>;
}

// ===========================================
// Utility: Get appropriate dashboard for role
// ===========================================

export function getDashboardForRole(role: UserRole): string {
  return ROLE_DASHBOARDS[role] || '/';
}

export function getLoginRedirectForRole(role: UserRole): string {
  return ROLE_LOGIN_REDIRECTS[role] || '/dashboard';
}

export default RoleGuard;


