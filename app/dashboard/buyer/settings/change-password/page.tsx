'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { buyerApi } from '@/lib/api/client';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    resetCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    buyerApi.getProfile().then((res) => {
      setEmail(res.buyer.email);
    }).catch(() => {});
  }, []);

  const handleRequestCode = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await buyerApi.requestPasswordReset(email);
      setStep('reset');
      toast.success('Reset code sent to your email');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reset code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      await buyerApi.resetPassword(email, formData.resetCode, formData.newPassword);
      toast.success('Password changed successfully');
      router.push('/dashboard/buyer/settings');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="px-4 py-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-12 h-12 flex items-center justify-center"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 text-[#000000]" />
        </button>
      </header>

      <div className="px-4 pt-4">
        {step === 'reset' ? (
          <form onSubmit={handleResetPassword}>
            <h1 className="text-[44px] font-bold text-[#000000] mb-4">Check your email</h1>
            <p className="text-base text-[#6B7280] mb-8">
              Enter the 6 digit reset code Reach sent to {email} to create a new password
            </p>

            <input
              type="text"
              placeholder="Enter reset code here"
              value={formData.resetCode}
              onChange={(e) => setFormData({ ...formData, resetCode: e.target.value })}
              maxLength={6}
              className="w-full px-4 py-4 border border-[#E5E7EB] rounded-lg text-base placeholder-[#D1D5DB] mb-4 focus:outline-none focus:ring-2 focus:ring-[#1A3B5D]"
              required
            />

            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter New password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-4 border border-[#E5E7EB] rounded-lg text-base placeholder-[#D1D5DB] pr-12 focus:outline-none focus:ring-2 focus:ring-[#1A3B5D]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-[#9CA3AF]" />
                ) : (
                  <Eye className="w-5 h-5 text-[#9CA3AF]" />
                )}
              </button>
            </div>

            <div className="relative mb-8">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-type password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-4 border border-[#E5E7EB] rounded-lg text-base placeholder-[#D1D5DB] pr-12 focus:outline-none focus:ring-2 focus:ring-[#1A3B5D]"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5 text-[#9CA3AF]" />
                ) : (
                  <Eye className="w-5 h-5 text-[#9CA3AF]" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-base disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create new password'}
            </button>
          </form>
        ) : (
          <div>
            <h1 className="text-[44px] font-bold text-[#000000] mb-4">Change Password</h1>
            <p className="text-base text-[#6B7280] mb-8">
              Enter your email to receive a password reset code
            </p>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-4 border border-[#E5E7EB] rounded-lg text-base placeholder-[#D1D5DB] mb-8 focus:outline-none focus:ring-2 focus:ring-[#1A3B5D]"
              required
            />
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={isSubmitting}
              className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-base disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Code'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
