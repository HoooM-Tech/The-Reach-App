'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { DeveloperGuard } from '@/components/auth/RoleGuard';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Calendar, 
  Wallet, 
  Settings, 
  LogOut,
  Bell,
  ChevronLeft,
  Menu
} from 'lucide-react';

// ===========================================
// Navigation Items - Developer Only
// ===========================================

const DEVELOPER_NAV_ITEMS = [
  { href: '/dashboard/developer', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/developer/properties', label: 'Properties', icon: Building2 },
  { href: '/dashboard/developer/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/developer/inspections', label: 'Inspections', icon: Calendar },
  { href: '/dashboard/developer/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/developer/settings', label: 'Settings', icon: Settings },
];

// ===========================================
// Developer Layout Component
// ===========================================

function DeveloperLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Check if current path matches nav item
  const isActive = (href: string) => {
    if (href === '/dashboard/developer') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => {
              // Navigate to dashboard if we can't go back
              if (window.history.length <= 1) {
                router.push('/dashboard/developer');
              } else {
                router.back();
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-semibold text-[#0A1628]">
            {DEVELOPER_NAV_ITEMS.find(item => isActive(item.href))?.label || 'Developer'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/notifications')}
              className="p-2 rounded-full hover:bg-gray-100 relative"
            >
              <Bell size={20} />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0A1628] flex items-center justify-center text-white font-bold">
                  {user?.full_name?.[0] || user?.email?.[0] || 'D'}
                </div>
                <div>
                  <p className="font-semibold text-sm">{user?.full_name || 'Developer'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
            <nav className="p-2">
              {DEVELOPER_NAV_ITEMS.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive(item.href)
                      ? 'bg-[#0A1628] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              <hr className="my-2" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-gray-100">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="px-4 mb-8">
            <h1 className="text-xl font-bold text-[#0A1628]">Reach</h1>
            <p className="text-xs text-gray-500 mt-1">Developer Portal</p>
          </div>

          {/* User Info */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#0A1628] flex items-center justify-center text-white font-bold">
                {user?.full_name?.[0] || user?.email?.[0] || 'D'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user?.full_name || 'Developer'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {DEVELOPER_NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  isActive(item.href)
                    ? 'bg-[#0A1628] text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-2 mt-auto pt-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="min-h-screen">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="flex justify-around py-2">
          {DEVELOPER_NAV_ITEMS.slice(0, 5).map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center py-1 px-3 ${
                isActive(item.href) ? 'text-[#0A1628]' : 'text-gray-400'
              }`}
            >
              <item.icon size={20} />
              <span className="text-xs mt-1">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
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


