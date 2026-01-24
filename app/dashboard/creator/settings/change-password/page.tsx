'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { getAccessToken } from '@/lib/api/client';
import { ArrowLeft, Eye, EyeOff, ChevronDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CreatorChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth/login');
      return;
    }

    // Request password reset code on page load
    if (user?.email) {
      requestResetCode();
    }
  }, [user, userLoading, router]);

  const requestResetCode = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: user?.email }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.code && process.env.NODE_ENV === 'development') {
          console.log('Reset code (dev only):', data.code);
        }
      }
    } catch (error) {
      console.error('Failed to request reset code:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (resetCode.length !== 6) {
      setError('Please enter a valid 6-digit reset code');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Password must include uppercase, lowercase, and a number');
      return;
    }

    if (newPassword !== retypePassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const token = getAccessToken();
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user?.email,
          code: resetCode,
          newPassword,
          confirmPassword: retypePassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      alert('Password changed successfully! Please login with your new password.');
      router.push('/auth/login');
    } catch (error: any) {
      setError(error.message || 'Failed to change password. Please try again.');
      console.error('Failed to change password:', error);
    } finally {
      setSaving(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#1E3A5F] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-transparent px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div></div>
        <div></div>
      </header>

      {/* Main Content */}
      <div className="px-4 pt-6 pb-32">
        <h2 className="text-[32px] font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-base text-gray-600 mb-8 leading-relaxed">
          Enter the 6 digit reset code Reach sent to {user?.email || 'your email'} to create a new
          password.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reset Code Input */}
          <div>
            <input
              type="text"
              value={resetCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setResetCode(value);
              }}
              placeholder="Enter reset code here"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none"
              maxLength={6}
              required
            />
          </div>

          {/* New Password Input */}
          <div>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter New password"
                className="w-full px-4 py-4 pr-20 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none"
                required
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <ChevronDown size={20} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Re-type Password Input */}
          <div>
            <div className="relative">
              <input
                type={showRetypePassword ? 'text' : 'password'}
                value={retypePassword}
                onChange={(e) => setRetypePassword(e.target.value)}
                placeholder="Re-type password"
                className="w-full px-4 py-4 pr-20 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none"
                required
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRetypePassword(!showRetypePassword)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showRetypePassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <ChevronDown size={20} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full mt-8 bg-[#1E3A5F] text-white font-semibold py-4 rounded-full hover:bg-[#1E3A5F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
