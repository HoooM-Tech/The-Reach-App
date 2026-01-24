'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { getAccessToken } from '@/lib/api/client';
import { ArrowLeft, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface NotificationSettings {
  contractUpdate: boolean;
  newLeads: boolean;
  inspectionBookings: boolean;
  handoverReminders: boolean;
  payoutUpdate: boolean;
}

export default function CreatorNotificationSettingsPage() {
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
      const token = getAccessToken();
      const response = await fetch('/api/creator/notifications/settings', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data);
      // Also save to localStorage as backup
      localStorage.setItem('creator-notification-settings', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('creator-notification-settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, userLoading]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth/login');
      return;
    }

    fetchSettings();
  }, [user, userLoading, router, fetchSettings]);

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };

    // Optimistic update
    setSettings(newSettings);
    setIsSaving(true);

    try {
      const token = getAccessToken();
      const response = await fetch('/api/creator/notifications/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Also save to localStorage as backup
      localStorage.setItem('creator-notification-settings', JSON.stringify(newSettings));
      toast.success('Settings updated');
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      // Revert on error
      setSettings(settings);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin"></div>
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
      <header className="bg-transparent px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Notification</h1>
        <button
          className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
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
              <span className="text-base font-medium text-gray-900">{item.label}</span>
              <button
                onClick={() => handleToggle(item.key)}
                disabled={isSaving}
                className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors duration-200 ${
                  settings[item.key] ? 'bg-[#10B981]' : 'bg-gray-200'
                } disabled:opacity-50`}
                aria-label={`${settings[item.key] ? 'Disable' : 'Enable'} ${item.label}`}
              >
                <span
                  className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white transition-transform duration-200 ${
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
