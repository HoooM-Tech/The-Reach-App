'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '../../contexts/UserContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required role(s) to access this route. If not specified, any authenticated user can access. */
  allowedRoles?: UserRole[];
  /** Custom redirect path if not authenticated. Defaults to /login */
  redirectTo?: string;
  /** Whether to show a loading spinner while checking auth */
  showLoading?: boolean;
}

/**
 * ProtectedRoute component that wraps pages requiring authentication.
 * Handles auth state checking and redirects unauthorized users.
 * 
 * @example
 * // Allow any authenticated user
 * <ProtectedRoute>
 *   <DashboardContent />
 * </ProtectedRoute>
 * 
 * @example
 * // Only allow developers and admins
 * <ProtectedRoute allowedRoles={['developer', 'admin']}>
 *   <DeveloperDashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = '/login',
  showLoading = true 
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useUser();

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
      router.push(redirectUrl);
      return;
    }

    // Check role authorization if roles are specified
    if (allowedRoles && allowedRoles.length > 0) {
      const hasAccess = allowedRoles.includes(user.role as UserRole);
      if (!hasAccess) {
        // Redirect to appropriate page based on role
        const roleRedirect = getRoleBasedRedirect(user.role as UserRole);
        router.push(roleRedirect);
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname, redirectTo]);

  // Show loading state
  if (isLoading) {
    if (!showLoading) return null;
    return <LoadingSpinner />;
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return showLoading ? <LoadingSpinner /> : null;
  }

  // Check role access
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.includes(user.role as UserRole);
    if (!hasAccess) {
      return showLoading ? <LoadingSpinner /> : null;
    }
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
}

/**
 * Get the default redirect path for a user role
 */
function getRoleBasedRedirect(role: UserRole): string {
  switch (role) {
    case 'developer':
      return '/dashboard/developer';
    case 'creator':
      return '/dashboard';
    case 'buyer':
      return '/dashboard';
    case 'admin':
      return '/admin/properties';
    default:
      return '/dashboard';
  }
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-reach-light">
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-reach-navy/20 border-t-reach-navy animate-spin" />
        </div>
        <p className="text-reach-navy font-semibold">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Higher-order component version for easier use with page components
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;


