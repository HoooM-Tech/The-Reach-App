'use client';

import { ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
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
  FileEdit
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
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: contextUser } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Use user from props or context
  const currentUser = user || contextUser;

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/developer', icon: LayoutDashboard },
    { label: 'Listing', href: '/dashboard/developer/properties', icon: Building2 },
    { label: 'Drafts', href: '/dashboard/developer/properties/drafts', icon: FileEdit },
    { label: 'Leads', href: '/dashboard/developer/leads', icon: Users, badge: 1 },
    { label: 'Inspections', href: '/dashboard/developer/inspections', icon: Camera, badge: 2 },
    { label: 'Wallet', href: '/dashboard/developer/wallet', icon: Wallet },
    { label: 'Documents', href: '/dashboard/developer/documents', icon: FileText },
  ];

  const accountItems = [
    { label: 'Profile', href: '/dashboard/developer/profile', icon: User },
    { label: 'Settings & Privacy', href: '/dashboard/developer/settings', icon: Settings },
    { label: 'Help Center', href: '/dashboard/developer/help', icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard/developer') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-reach-light">
      {/* Mobile Header */}
      <header className="lg:hidden p-6 bg-white flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {(user as any)?.avatarUrl && (
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              <img src={(user as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-sm">{(user as any)?.companyName || 'Company'}</h1>
              <div className="w-3 h-3 bg-reach-red rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L9 10.586l3.293-3.293a1 1 0 011.414 1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/notifications')}
            className="bg-gray-50 p-2.5 rounded-full text-gray-500 hover:text-reach-navy"
          >
            <Bell size={20} />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-gray-50 p-2.5 rounded-full text-gray-500"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            {/* User Info */}
            <div className="flex items-center gap-3 px-6 mb-8">
              {(user as any)?.avatarUrl && (
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                  <img src={(user as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs text-gray-400">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
                <div className="flex items-center gap-1">
                  <h1 className="font-bold text-sm">{(user as any)?.companyName || 'Company'}</h1>
                  <div className="w-3 h-3 bg-reach-red rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L9 10.586l3.293-3.293a1 1 0 011.414 1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors
                      ${active 
                        ? 'bg-reach-navy text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Account Section */}
            <div className="px-4 pt-4 border-t border-gray-200 space-y-1">
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
              <div className="flex flex-col h-full pt-6 pb-4">
                {/* User Info */}
                <div className="flex items-center gap-3 px-6 mb-8">
                  {(user as any)?.avatarUrl && (
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                      <img src={(user as any).avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
                    <div className="flex items-center gap-1">
                      <h1 className="font-bold text-sm">{(user as any)?.companyName || 'Company'}</h1>
                      <div className="w-3 h-3 bg-reach-red rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L9 10.586l3.293-3.293a1 1 0 011.414 1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href);
                          setSidebarOpen(false);
                        }}
                        className={`
                          w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors
                          ${active 
                            ? 'bg-reach-navy text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={20} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Account Section */}
                <div className="px-4 pt-4 border-t border-gray-200 space-y-1">
                  {accountItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href);
                          setSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          {children}
        </main>
      </div>
    </div>
  );
}

