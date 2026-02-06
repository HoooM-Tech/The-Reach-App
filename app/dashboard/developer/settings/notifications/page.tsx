'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { notificationSettingsApi, ApiError } from '@/lib/api/client';
import { ArrowLeft, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface NotificationSettings {
  contractUpdate: boolean;
  newLeads: boolean;
  inspectionBookings: boolean;
  handoverReminders: boolean;
  payoutUpdate: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [settings, setSettings] = useState<NotificationSettings>({
    contractUpdate: true,
    newLeads: true,
    inspectionBookings: true,
    handoverReminders: true,
    payoutUpdate: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch notification settings
  const fetchSettings = useCallback(async () => {
    if (!user?.id || userLoading) return;

    setIsLoading(true);
    try {
      const data = await notificationSettingsApi.getSettings();
      setSettings(data);
      // Also save to localStorage as backup
      localStorage.setItem('developer-notification-settings', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('developer-notification-settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, userLoading]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    fetchSettings();
  }, [user, userLoading, router, fetchSettings]);

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    
    setSettings(newSettings);
    setIsSaving(true);

    try {
      await notificationSettingsApi.updateSettings(newSettings);
      // Also save to localStorage as backup
      localStorage.setItem('developer-notification-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      // Revert on error
      setSettings(settings);
      const message = error instanceof ApiError ? error.message : 'Failed to save settings. Please try again.';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-reach-primary border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  const notificationItems: Array<{ key: keyof NotificationSettings; label: string }> = [
    { key: 'contractUpdate', label: 'Contract Update' },
    { key: 'newLeads', label: 'New Leads' },
    { key: 'inspectionBookings', label: 'Inspection Bookings' },
    { key: 'handoverReminders', label: 'Handover Reminders' },
    { key: 'payoutUpdate', label: 'Payout Update' },
  ];

  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      {/* Header */}
      <header className="bg-transparent px-4 py-4 flex items-center justify-between top-0 z-40">
        { /*
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        */}
        <h1 className="text-lg font-semibold text-gray-900">Notification</h1>
        { /*
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
        */}
      </header>

      {/* Main Content */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {notificationItems.map((item, index) => (
            <div
              key={item.key}
              className={`flex items-center justify-between px-5 py-4 ${
                index < notificationItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              <button
                onClick={() => handleToggle(item.key)}
                disabled={isSaving}
                className={`relative inline-flex h-8 w-12 items-center rounded-full transition-colors duration-200 ${
                  settings[item.key] ? 'bg-green-500' : 'bg-gray-300'
                } disabled:opacity-50`}
                aria-label={`${settings[item.key] ? 'Disable' : 'Enable'} ${item.label}`}
              >
                <span
                  className={`inline-block h-7 w-7 transform rounded-full bg-white transition-transform duration-200 ${
                    settings[item.key] ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
