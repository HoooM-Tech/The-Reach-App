'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccessToken } from '@/lib/api/client';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Camera, 
  Wallet, 
  FileText,
  User,
  Settings,
  HelpCircle,
  Bell,
  Menu,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

interface DashboardShellProps {
  children: ReactNode;
  user?: { name?: string; companyName?: string; avatarUrl?: string };
  navItems?: NavItem[];
  accountItems?: Array<{ label: string; href: string; icon: React.ComponentType<any> }>;
  basePath?: string; // Base path for active route detection (e.g., '/dashboard/developer' or '/dashboard/creator')
}

export function DashboardShell({ children, user, navItems: customNavItems, accountItems: customAccountItems, basePath = '/dashboard/developer' }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: contextUser } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [inspectionsCount, setInspectionsCount] = useState<number | null>(null);
  
  // Use user from props or context
  const currentUser = user || contextUser;

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      // Focus first focusable element
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Handle Esc key to close sidebar
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [sidebarOpen]);

  // Focus trap
  useEffect(() => {
    if (!sidebarOpen) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = sidebarRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [sidebarOpen]);

  // Fetch counts from API when component mounts, user changes, or when navigating to leads/inspections pages
  useEffect(() => {
    const fetchCounts = async () => {
      // Only fetch if user is authenticated and is a developer
      if (!contextUser?.id || (contextUser.role !== 'developer' && contextUser.role !== 'admin')) {
        console.log('[DashboardShell] Skipping counts fetch - user not developer:', contextUser?.role);
        setLeadsCount(0);
        setInspectionsCount(0);
        return;
      }

      console.log('[DashboardShell] Fetching counts for user:', contextUser.id);
      try {
        // Get access token for Authorization header
        const token = getAccessToken();
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/dashboard/developer/counts', {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[DashboardShell] Failed to fetch counts:', response.status, errorText);
          // Set to 0 on error to avoid showing stale data
          setLeadsCount(0);
          setInspectionsCount(0);
          return;
        }

        const data = await response.json();
        console.log('[DashboardShell] Received counts:', data);
        setLeadsCount(data.leadsCount ?? 0);
        setInspectionsCount(data.inspectionsCount ?? 0);
      } catch (error) {
        console.error('[DashboardShell] Error fetching counts:', error);
        // Set to 0 on error to avoid showing stale data
        setLeadsCount(0);
        setInspectionsCount(0);
      }
    };

    fetchCounts();
  }, [contextUser?.id, contextUser?.role, pathname]);

  // Build nav items with dynamic badge counts
  // Use custom nav items if provided, otherwise use default developer nav items
  const defaultNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/developer', icon: LayoutDashboard },
    { label: 'Listing', href: '/dashboard/developer/properties', icon: Building2 },
    { 
      label: 'Leads', 
      href: '/dashboard/developer/leads', 
      icon: Building2, 
      badge: leadsCount !== null ? leadsCount : undefined 
    },
    { 
      label: 'Inspections', 
      href: '/dashboard/developer/inspections', 
      icon: Camera, 
      badge: inspectionsCount !== null ? inspectionsCount : undefined 
    },
    { label: 'Wallet', href: '/dashboard/developer/wallet', icon: Wallet },
    { label: 'Documents', href: '/dashboard/developer/documents', icon: Wallet },
  ];

  const defaultAccountItems = [
    { label: 'Profile', href: '/dashboard/developer/profile', icon: User },
    { label: 'Settings & Privacy', href: '/dashboard/developer/settings', icon: Settings },
    { label: 'Help Center', href: '/dashboard/developer/help', icon: HelpCircle },
  ];

  const navItems = customNavItems || defaultNavItems;
  const accountItems = customAccountItems || defaultAccountItems;

  const isActive = (href: string) => {
    if (href === basePath) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Determine if we're on the dashboard home
  const isDashboardHome = pathname === basePath;
  
  // Determine if we need a back button (for detail pages)
  const showBackButton = (pathname.includes('/properties/') && pathname !== `${basePath}/properties`) ||
                         (pathname.includes('/leads/') && pathname !== `${basePath}/leads`) ||
                         (pathname.includes('/inspections/') && pathname !== `${basePath}/inspections`) ||
                         pathname.includes('/wallet/') ||
                         pathname.includes('/handover/') ||
                         pathname.includes('/settings/') ||
                         pathname === `${basePath}/profile/edit` ||
                         pathname.includes('/links/') ||
                         pathname.includes('/analytics/') ||
                         pathname.includes('/social/');
  
  // Get page title for simplified header
  const getPageTitle = (): string | null => {
    if (pathname === `${basePath}/properties`) return 'Properties';
    if (pathname === `${basePath}/leads`) return 'Leads';
    if (pathname === `${basePath}/inspections`) return 'Inspections';
    if (pathname === `${basePath}/profile`) return 'Profile';
    if (pathname === `${basePath}/settings`) return 'Settings';
    if (pathname === `${basePath}/wallet`) return 'Wallet';
    if (pathname === `${basePath}/links`) return 'My Links';
    if (pathname === `${basePath}/analytics`) return 'Analytics';
    if (pathname === `${basePath}/social`) return 'Social Media';
    return null;
  };
  
  const pageTitle = getPageTitle();

  return (
    <div className="min-h-screen bg-reach-bg">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200 lg:z-30">
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* User Info */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {(user as any)?.avatarUrl ? (
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  <img src={(user as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 mb-1">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-lg text-black">{(user as any)?.companyName || 'Company'}</h1>
                  <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="w-full flex items-center justify-between py-3 text-sm text-black hover:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className="text-black" />
                    <span className="font-normal">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[20px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Account Section */}
          <div className="px-6 py-4 border-t border-gray-200 space-y-1">
            {accountItems.map((item) => {
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="w-full text-left py-2 text-sm text-black hover:opacity-70 transition-opacity"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Content Area with Sidebar Spacing */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        {isDashboardHome ? (
        // Style 1: Dashboard Home Header (WITH User Profile)
        <header className="lg:hidden px-4 py-4 bg-[#FFF5F5] flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {(user as any)?.avatarUrl ? (
              <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                <img src={(user as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {(user as any)?.companyName || 'Company'}
                <div className="w-4 h-4 bg-reach-red rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/notifications')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Toggle menu"
              title="Menu"
              {...(sidebarOpen ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </header>
      ) : (
        // Style 2: Simplified Header (WITHOUT User Profile)
        <header className="lg:hidden px-4 py-4 bg-[#FFF5F5] flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <button
                onClick={() => router.back()}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                aria-label="Back"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
            ) : pageTitle ? (
              <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/notifications')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Toggle menu"
              title="Menu"
              {...(sidebarOpen ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </header>
      )}

        {/* Desktop Header */}
        {isDashboardHome ? (
          // Style 1: Dashboard Home Header (WITH User Profile) - Desktop
          <header className="hidden lg:flex px-4 py-4 bg-[#FFF5F5] items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {(user as any)?.avatarUrl ? (
              <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                <img src={(user as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {(user as any)?.companyName || 'Company'}
                <div className="w-4 h-4 bg-reach-red rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/notifications')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          </header>
        ) : (
          // Style 2: Simplified Header (WITHOUT User Profile) - Desktop
          <header className="hidden lg:flex px-4 py-4 bg-[#FFF5F5] items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <button
                onClick={() => router.back()}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
                aria-label="Back"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
            ) : pageTitle ? (
              <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/notifications')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          </header>
        )}

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" aria-hidden="false">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              />
              
              {/* Sidebar */}
              <motion.div
                ref={sidebarRef}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ 
                  type: 'tween',
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1] // Custom easing for smooth slide
                }}
                className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                <div className="flex flex-col h-full overflow-y-auto">
                  {/* User Info */}
                  <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      {(user as any)?.avatarUrl ? (
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          <img src={(user as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User size={24} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 mb-1">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
                        <div className="flex items-center gap-2">
                          <h1 className="font-bold text-lg text-black">{(user as any)?.companyName || 'Company'}</h1>
                          <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="flex-1 px-6 py-4 space-y-0">
                    {navItems.map((item, index) => {
                      const Icon = item.icon;
                      const isFirst = index === 0;
                      return (
                        <button
                          key={item.href}
                          ref={isFirst ? firstFocusableRef : null}
                          onClick={() => {
                            router.push(item.href);
                            setSidebarOpen(false);
                          }}
                          className="w-full flex items-center justify-between py-3 text-sm text-black hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300"
                          tabIndex={0}
                        >
                          <div className="flex items-center gap-3">
                            <Icon size={20} className="text-black" strokeWidth={1.5} />
                            <span className="font-normal">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[20px]">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>

                  {/* Account Section */}
                  <div className="px-6 pt-6 pb-4 mt-auto border-t border-gray-200 space-y-1">
                    {accountItems.map((item) => {
                      return (
                        <button
                          key={item.href}
                          onClick={() => {
                            router.push(item.href);
                            setSidebarOpen(false);
                          }}
                          className="w-full text-left py-2 text-sm text-black hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300"
                          tabIndex={0}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

