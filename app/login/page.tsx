'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '../../contexts/UserContext';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, isAuthenticated, error, clearError, user } = useUser();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const isExpired = searchParams.get('expired') === 'true';

  // Show session expired message if redirected due to expiry
  useEffect(() => {
    if (isExpired && !formError && !error) {
      setFormError('Your session has expired. Please log in again.');
    }
  }, [isExpired]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      const destination = getRedirectForRole(user.role);
      router.push(destination);
    }
  }, [isAuthenticated, user, router]);

  // Get appropriate redirect based on user role
  // STRICT ROLE ISOLATION: Each role has its own dashboard
  const getRedirectForRole = (role: string): string => {
    switch (role) {
      case 'developer':
        return '/dashboard/developer';
      case 'creator':
        return '/dashboard/creator';
      case 'buyer':
        return '/dashboard/buyer';
      case 'admin':
        return '/admin/properties';
      default:
        return '/dashboard'; // Will redirect to role-specific dashboard
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!email.trim()) {
      setFormError('Please enter your email address');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setFormError('Please enter your password');
      return false;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await login(email, password);
      
      // Redirect based on user role
      if (response.user) {
        const destination = getRedirectForRole(response.user.role);
        router.push(destination);
      }
    } catch (err: any) {
      // Error is already handled in context, but we can show additional info
      setFormError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear form error when inputs change
  useEffect(() => {
    if (formError) setFormError(null);
    if (error) clearError();
  }, [email, password]);

  const displayError = formError || error;

  return (
    <div className="min-h-screen bg-reach-light flex flex-col">
      {/* Header */}
      <header className="p-6">
        <button 
          onClick={() => router.push('/')} 
          className="bg-white p-2.5 rounded-full shadow-sm hover:shadow-md transition-shadow"
          aria-label="Go back to home"
          type="button"
        >
          <ArrowLeft size={20} className="text-reach-navy" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-8 pb-12">
        <div className="max-w-md mx-auto w-full">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-reach-navy mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-500">
              Sign in to continue to your account
            </p>
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className={`mb-6 p-4 border rounded-xl flex items-start gap-3 animate-fadeIn ${
              isExpired 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isExpired ? 'text-amber-500' : 'text-red-500'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  isExpired ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {isExpired ? 'Session Expired' : 'Login Failed'}
                </p>
                <p className={`text-sm mt-1 ${
                  isExpired ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {displayError}
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 border rounded-xl outline-none transition-all bg-white
                    ${displayError ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 
                    'border-gray-200 focus:border-reach-red focus:ring-2 focus:ring-reach-red/10'}`}
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-4 border rounded-xl outline-none transition-all bg-white
                    ${displayError ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 
                    'border-gray-200 focus:border-reach-red focus:ring-2 focus:ring-reach-red/10'}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff size={20} className="text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye size={20} className="text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button 
                type="button"
                className="text-sm text-reach-red font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg
                ${isSubmitting || isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-reach-navy hover:bg-reach-navy/90 active:scale-[0.98]'}`}
            >
              {isSubmitting || isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">Google</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="#000" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">GitHub</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-gray-500">
            Don't have an account?{' '}
            <Link href="/role-selection" className="text-reach-navy font-bold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

