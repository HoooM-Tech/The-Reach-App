'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';

interface PlatformSettings {
  general: any;
  commission: any;
  verification: any;
  payment: any;
  notifications: any;
  security: any;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (response.ok) {
        alert('Settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1628]"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-500">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#0A1628] text-white rounded-lg font-medium hover:bg-[#0A1628]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-1">
          <div className="flex space-x-1">
            {['general', 'commission', 'verification', 'payment', 'notifications', 'security'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-[#0A1628] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">General Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                  <input
                    title="Platform name input"
                    aria-label="Platform name input"
                    type="text"
                    value={settings.general?.platform_name || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, platform_name: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                  <input
                    title="Contact email input"
                    aria-label="Contact email input"
                    type="email"
                    value={settings.general?.contact_email || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, contact_email: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
                  <input
                    title="Support phone input"
                    aria-label="Support phone input"
                    type="tel"
                    value={settings.general?.support_phone || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, support_phone: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Commission Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Developer Commission Rate (%)</label>
                  <input
                    title="Developer commission rate input"
                    aria-label="Developer commission rate input"
                    type="number"
                    value={settings.commission?.developer_rate || 80}
                    onChange={(e) => setSettings({
                      ...settings,
                      commission: { ...settings.commission, developer_rate: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Creator Tier 1 Commission (%)</label>
                    <input
                      title="Creator tier 1 commission input"
                      aria-label="Creator tier 1 commission input"
                      type="number"
                      step="0.1"
                      value={settings.commission?.creator_tier_1 || 3.0}
                      onChange={(e) => setSettings({
                        ...settings,
                        commission: { ...settings.commission, creator_tier_1: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Creator Tier 2 Commission (%)</label>
                    <input
                      title="Creator tier 2 commission input"
                      aria-label="Creator tier 2 commission input"
                      type="number"
                      step="0.1"
                      value={settings.commission?.creator_tier_2 || 2.5}
                      onChange={(e) => setSettings({
                        ...settings,
                        commission: { ...settings.commission, creator_tier_2: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Creator Tier 3 Commission (%)</label>
                    <input
                      title="Creator tier 3 commission input"
                      aria-label="Creator tier 3 commission input"
                      type="number"
                      step="0.1"
                      value={settings.commission?.creator_tier_3 || 2.0}
                      onChange={(e) => setSettings({
                        ...settings,
                        commission: { ...settings.commission, creator_tier_3: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Creator Tier 4 Commission (%)</label>
                    <input
                      title="Creator tier 4 commission input"
                      aria-label="Creator tier 4 commission input"
                      type="number"
                      step="0.1"
                      value={settings.commission?.creator_tier_4 || 1.5}
                      onChange={(e) => setSettings({
                        ...settings,
                        commission: { ...settings.commission, creator_tier_4: parseFloat(e.target.value) }
                      })}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform Fee (%)</label>
                  <input
                    title="Platform fee input"
                    aria-label="Platform fee input"
                    type="number"
                    value={settings.commission?.platform_fee || 5}
                    onChange={(e) => setSettings({
                      ...settings,
                      commission: { ...settings.commission, platform_fee: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Verification Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Verification Required</label>
                    <p className="text-sm text-gray-500">Users must verify their email address</p>
                  </div>
                  <input
                    title="Email verification required input"
                    aria-label="Email verification required input"
                    type="checkbox"
                    checked={settings.verification?.email_required || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      verification: { ...settings.verification, email_required: e.target.checked }
                    })}
                    className="w-5 h-5 text-[#0A1628] border-gray-300 rounded focus:ring-[#0A1628]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Verification Required</label>
                    <p className="text-sm text-gray-500">Users must verify their phone number</p>
                  </div>
                  <input
                    title="Phone verification required input"
                    aria-label="Phone verification required input"
                    type="checkbox"
                    checked={settings.verification?.phone_required || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      verification: { ...settings.verification, phone_required: e.target.checked }
                    })}
                    className="w-5 h-5 text-[#0A1628] border-gray-300 rounded focus:ring-[#0A1628]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Review SLA (Hours)</label>
                  <input
                    title="Property review SLA hours input"
                    aria-label="Property review SLA hours input"
                    type="number"
                    value={settings.verification?.property_review_sla_hours || 48}
                    onChange={(e) => setSettings({
                      ...settings,
                      verification: { ...settings.verification, property_review_sla_hours: parseInt(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Payment Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Fee (₦)</label>
                  <input
                    title="Withdrawal fee input"
                    aria-label="Withdrawal fee input"
                    type="number"
                    value={settings.payment?.withdrawal_fee || 100}
                    onChange={(e) => setSettings({
                      ...settings,
                      payment: { ...settings.payment, withdrawal_fee: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Transfer Amount (₦)</label>
                  <input
                    title="Maximum transfer amount input"
                    aria-label="Maximum transfer amount input"
                    type="number"
                    value={settings.payment?.max_transfer_amount || 10000000}
                    onChange={(e) => setSettings({
                      ...settings,
                      payment: { ...settings.payment, max_transfer_amount: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Transfer Limit (₦)</label>
                  <input
                    title="Daily transfer limit input"
                    aria-label="Daily transfer limit input"
                    type="number"
                    value={settings.payment?.daily_transfer_limit || 5000000}
                    onChange={(e) => setSettings({
                      ...settings,
                      payment: { ...settings.payment, daily_transfer_limit: parseFloat(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Notification Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Notifications</label>
                    <p className="text-sm text-gray-500">Enable email notifications</p>
                  </div>
                  <input
                    title="Email notifications input"
                    aria-label="Email notifications input"
                    type="checkbox"
                    checked={settings.notifications?.email_enabled || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, email_enabled: e.target.checked }
                    })}
                    className="w-5 h-5 text-[#0A1628] border-gray-300 rounded focus:ring-[#0A1628]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SMS Notifications</label>
                    <p className="text-sm text-gray-500">Enable SMS notifications</p>
                  </div>
                  <input
                    title="SMS notifications input"
                    aria-label="SMS notifications input"
                    type="checkbox"
                    checked={settings.notifications?.sms_enabled || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, sms_enabled: e.target.checked }
                    })}
                    className="w-5 h-5 text-[#0A1628] border-gray-300 rounded focus:ring-[#0A1628]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Push Notifications</label>
                    <p className="text-sm text-gray-500">Enable push notifications</p>
                  </div>
                  <input
                    title="Push notifications input"
                    aria-label="Push notifications input"
                    type="checkbox"
                    checked={settings.notifications?.push_enabled || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, push_enabled: e.target.checked }
                    })}
                    className="w-5 h-5 text-[#0A1628] border-gray-300 rounded focus:ring-[#0A1628]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (Minutes)</label>
                  <input
                    title="Session timeout minutes input"
                    aria-label="Session timeout minutes input"
                    type="number"
                    value={settings.security?.session_timeout_minutes || 60}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, session_timeout_minutes: parseInt(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password Minimum Length</label>
                  <input
                    title="Password minimum length input"
                    aria-label="Password minimum length input"
                    type="number"
                    value={settings.security?.password_min_length || 8}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, password_min_length: parseInt(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Two-Factor Authentication</label>
                    <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                  </div>
                  <input
                    title="Two-factor authentication input"
                    aria-label="Two-factor authentication input"
                    type="checkbox"
                    checked={settings.security?.two_factor_enabled || false}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, two_factor_enabled: e.target.checked }
                    })}
                    className="w-5 h-5 text-[#0A1628] border-gray-300 rounded focus:ring-[#0A1628]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Login Attempt Limit</label>
                  <input
                    title="Login attempt limit input"
                    aria-label="Login attempt limit input"
                    type="number"
                    value={settings.security?.login_attempt_limit || 5}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, login_attempt_limit: parseInt(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1628] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
