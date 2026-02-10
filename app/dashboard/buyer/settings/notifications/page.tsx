'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell } from 'lucide-react';
import { buyerApi } from '@/lib/api/client';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

interface NotificationPreferences {
  contractUpdate: boolean;
  newLeads: boolean;
  inspectionBookings: boolean;
  handoverReminders: boolean;
  payoutUpdate: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  contractUpdate: true,
  newLeads: true,
  inspectionBookings: true,
  handoverReminders: true,
  payoutUpdate: true,
};

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    buyerApi.getNotificationPreferences()
      .then((res) => setPreferences(res.preferences))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    setPreferences((p) => ({ ...p, [key]: newValue }));
    try {
      await buyerApi.updateNotificationPreferences({ [key]: newValue });
    } catch {
      setPreferences((p) => ({ ...p, [key]: !newValue }));
      toast.error('Failed to update preference');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <p className="text-base text-[#6B7280]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <header className="px-4 py-3 flex items-center justify-between bg-white shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 text-[#000000]" />
        </button>
        <h1 className="text-lg font-semibold text-[#000000]">Notification</h1>
        <button
          type="button"
          onClick={() => router.push('/dashboard/notifications')}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6 text-[#000000]" />
        </button>
      </header>

      <div className="px-4 pt-6">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E7EB]">
          {[
            { key: 'contractUpdate' as const, label: 'Contract Update' },
            { key: 'newLeads' as const, label: 'New Leads' },
            { key: 'inspectionBookings' as const, label: 'Inspection Bookings' },
            { key: 'handoverReminders' as const, label: 'Handover Reminders' },
            { key: 'payoutUpdate' as const, label: 'Payout Update' },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] last:border-b-0"
            >
              <span className="text-base font-medium text-[#000000]">{label}</span>
              <button
                type="button"
                onClick={() => handleToggle(key)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  preferences[key] ? 'bg-[#10B981]' : 'bg-gray-300'
                }`}
                aria-label={`${preferences[key] ? 'Disable' : 'Enable'} ${label}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    preferences[key] ? 'translate-x-6' : 'translate-x-1'
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
