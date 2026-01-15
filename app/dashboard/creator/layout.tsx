'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { CreatorGuard } from '@/components/auth/RoleGuard';
import { 
  LayoutDashboard, 
  Link2, 
  TrendingUp, 
  Wallet, 
  Settings, 
  LogOut,
  Bell,
  ChevronLeft,
  Menu,
  Building2
} from 'lucide-react';

// ===========================================
// Navigation Items - Creator Only
// ===========================================

const CREATOR_NAV_ITEMS = [
  { href: '/dashboard/creator', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/creator/properties', label: 'Properties', icon: Building2 },
  { href: '/dashboard/creator/links', label: 'My Links', icon: Link2 },
  { href: '/dashboard/creator/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/creator/settings', label: 'Settings', icon: Settings },
];

// ===========================================
// Creator Layout Component
// ===========================================

function CreatorLayoutContent({ children }: { children: React.ReactNode }) {
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
    if (href === '/dashboard/creator') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Get tier badge
  const getTierBadge = (tier: number) => {
    const tiers: Record<number, { label: string; color: string }> = {
      1: { label: 'Bronze', color: 'bg-amber-600' },
      2: { label: 'Silver', color: 'bg-gray-400' },
      3: { label: 'Gold', color: 'bg-yellow-500' },
      4: { label: 'Platinum', color: 'bg-purple-500' },
    };
    return tiers[tier] || tiers[1];
  };

  const tierInfo = getTierBadge(user?.tier || 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0a1628]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-full text-white hover:bg-white/10"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-semibold text-white">
            {CREATOR_NAV_ITEMS.find(item => isActive(item.href))?.label || 'Creator'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/notifications')}
              className="p-2 rounded-full text-white hover:bg-white/10 relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full text-white hover:bg-white/10"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-[#1a0a2e] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {user?.full_name?.[0] || user?.email?.[0] || 'C'}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{user?.full_name || 'Creator'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${tierInfo.color}`}>
                    {tierInfo.label} Creator
                  </span>
                </div>
              </div>
            </div>
            <nav className="p-2">
              {CREATOR_NAV_ITEMS.map((item) => (
                <button
                  type="button"
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              <hr className="my-2 border-white/10" />
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-white/5 backdrop-blur-xl border-r border-white/10">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="px-4 mb-8">
            <h1 className="text-xl font-bold text-white">Reach</h1>
            <p className="text-xs text-white/50 mt-1">Creator Portal</p>
          </div>

          {/* User Info */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {user?.full_name?.[0] || user?.email?.[0] || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-white">{user?.full_name || 'Creator'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full text-white ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {CREATOR_NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-2 mt-auto pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="flex justify-around py-2">
          {CREATOR_NAV_ITEMS.slice(0, 5).map((item) => (
            <button
              type="button"
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center py-1 px-3 ${
                isActive(item.href) ? 'text-white' : 'text-white/40'
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

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreatorGuard>
      <CreatorLayoutContent>{children}</CreatorLayoutContent>
    </CreatorGuard>
  );
}


