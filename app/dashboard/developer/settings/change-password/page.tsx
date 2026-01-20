'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ArrowLeft, Bell, Eye, EyeOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    // Role check is handled by layout/middleware
  }, [user, userLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetCode.length !== 6) {
      alert('Please enter a valid 6-digit reset code');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== retypePassword) {
      alert('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would call an API to reset the password
      alert('Password changed successfully!');
      router.push('/dashboard/developer/settings');
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password. Please try again.');
    } finally {
      setSaving(false);
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
      <header className="bg-transparent px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Bell size={20} className="text-gray-700" />
        </button>
      </header>

      {/* Main Content */}
      <div className="px-6 pt-6 pb-32">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter the 6 digit reset code Reach sent to {user?.email || 'rbnsnkngsl@gmail.com'} to create a new password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reset Code Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reset Code
              </label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setResetCode(value);
                }}
                placeholder="Enter reset code here"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
                maxLength={6}
                required
              />
            </div>

            {/* New Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter New password"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Re-type Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showRetypePassword ? 'text' : 'password'}
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  placeholder="Re-type password"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRetypePassword(!showRetypePassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showRetypePassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full mt-6 bg-reach-navy text-white font-semibold py-4 rounded-2xl hover:bg-reach-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

