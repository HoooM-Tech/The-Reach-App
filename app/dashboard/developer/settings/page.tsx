'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Menu, ChevronRight, LogOut } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface NotificationSettings {
  contractUpdate: boolean;
  newLeads: boolean;
  inspectionBookings: boolean;
  handoverReminders: boolean;
  payoutUpdate: boolean;
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading, logout } = useUser();
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    contractUpdate: true,
    newLeads: true,
    inspectionBookings: true,
    handoverReminders: true,
    payoutUpdate: true
  });
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([
    { id: '1', device: 'Chrome', location: 'Lagos', isActive: true },
    { id: '2', device: 'Safari', location: 'Mobile', isActive: false }
  ]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Role check is handled by layout/middleware
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('developer-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.twoFactorEnabled !== undefined) setTwoFactorEnabled(parsed.twoFactorEnabled);
        if (parsed.notifications) setNotifications(parsed.notifications);
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, [user, userLoading, router]);

  const handleToggle = (setting: 'twoFactor' | keyof NotificationSettings) => {
    if (setting === 'twoFactor') {
      const newValue = !twoFactorEnabled;
      setTwoFactorEnabled(newValue);
      saveSettings({ twoFactorEnabled: newValue });
    } else {
      const newNotifications = {
        ...notifications,
        [setting]: !notifications[setting]
      };
      setNotifications(newNotifications);
      saveSettings({ notifications: newNotifications });
    }
  };

  const saveSettings = (updates: Partial<{ twoFactorEnabled: boolean; notifications: NotificationSettings }>) => {
    const currentSettings = {
      twoFactorEnabled,
      notifications,
      ...updates
    };
    localStorage.setItem('developer-settings', JSON.stringify(currentSettings));
  };

  const handleLogoutSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    // In a real app, this would call an API to logout the session
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to home
      router.push('/');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // In a real app, this would call an API to delete the account
      alert('Account deletion requested. This feature will be implemented with backend integration.');
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-navy border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      {/*
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/notifications')}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Bell size={20} className="text-gray-700" />
          </button>
          <button
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Menu size={20} className="text-gray-700" />
          </button>
        </div>
      </header>
      */}

      {/* Main Content */}
      <div className="px-6 pb-8 space-y-4">
        {/* Account Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account</h2>
          
          {/* Password */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Password</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/developer/settings/change-password')}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span>Change password</span>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Two-Factor Authentication</p>
            </div>
            <button
              onClick={() => handleToggle('twoFactor')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
              aria-label={twoFactorEnabled ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
              title={twoFactorEnabled ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Email Address */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Email Address</p>
              <p className="text-xs text-gray-500 mt-0.5">{user?.email || 'rbnsnkngsl@gmail.com'}</p>
            </div>
            <button 
              className="text-sm text-[#FF6B35] font-semibold hover:text-[#D37D3E] transition-colors"
              aria-label="Change email address"
              title="Change email address"
            >
              Change
            </button>
          </div>

          {/* Active Sessions */}
          <div className="pt-3">
            <p className="text-sm font-semibold text-gray-900 mb-3">Active Sessions</p>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {session.device} - {session.location}
                      {session.isActive && (
                        <span className="ml-2 text-xs text-green-600 font-medium">Active</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLogoutSession(session.id)}
                    className="text-sm text-[#FF6B35] font-semibold hover:text-[#D37D3E] transition-colors"
                  >
                    Log out
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notification Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Notification</h2>
          
          {Object.entries(notifications).map(([key, value]) => {
            const label = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
            
            return (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <button
                  onClick={() => handleToggle(key as keyof NotificationSettings)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  aria-label={value ? `Disable ${label} notifications` : `Enable ${label} notifications`}
                  title={value ? `Disable ${label} notifications` : `Enable ${label} notifications`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Logout & Delete Account */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account Actions</h2>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-red-600" />
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Logout</p>
                <p className="text-xs text-gray-500">Sign out of your account</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          {/* Delete Account */}
          <div className="pt-4">
            <button
              onClick={handleDeleteAccount}
              className="text-sm text-red-600 font-semibold hover:text-red-700 transition-colors"
            >
              Delete my Account
            </button>
          </div>
        </div>
      </div>

      {/* Home Indicator */}
      <div className="h-0.5 bg-gray-900 w-32 mx-auto mb-2 rounded-full"></div>
    </div>
  );
}

