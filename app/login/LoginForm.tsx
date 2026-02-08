// app/login/LoginForm.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginForm({ 
  searchParams 
}: { 
  searchParams: { redirect?: string; expired?: string } 
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isExpired = searchParams.expired === 'true'

  React.useEffect(() => {
    if (isExpired && !error) {
      setError('Your session has expired. Please log in again.')
    }
  }, [isExpired, error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)

    try {
      // Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      console.log('Login successful:', data)

      // CRITICAL: Wait for Supabase session to be available
      const supabase = createSupabaseClient()
      let sessionReady = false
      let attempts = 0
      const maxAttempts = 20

      while (!sessionReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 150))
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          console.log('Session verified, redirecting...')
          sessionReady = true
          break
        }
        
        attempts++
      }

      if (!sessionReady) {
        console.warn('Session not ready after waiting, redirecting anyway...')
      }

      // Determine redirect destination
      const userRole = data.user?.role || 'buyer'
      const redirectParam = searchParams.redirect
      
      let destination: string
      
      if (redirectParam && isValidRedirectForRole(redirectParam, userRole)) {
        destination = decodeURIComponent(redirectParam)
      } else {
        destination = getRoleBasedDashboard(userRole)
      }

      console.log('Redirecting to:', destination)

      // Use window.location.href for a hard navigation that will pick up the new session
      window.location.href = destination
      
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  const getRoleBasedDashboard = (role: string): string => {
    switch (role) {
      case 'admin':
        return '/dashboard/admin'
      case 'developer':
        return '/dashboard/developer'
      case 'creator':
        return '/dashboard/creator'
      case 'buyer':
        return '/dashboard/buyer'
      default:
        return '/dashboard'
    }
  }

  const isValidRedirectForRole = (redirectPath: string, role: string): boolean => {
    if (!redirectPath) return false
    
    if (role === 'admin' && redirectPath.startsWith('/dashboard/admin')) return true
    if (role === 'developer' && redirectPath.startsWith('/dashboard/developer')) return true
    if (role === 'creator' && redirectPath.startsWith('/dashboard/creator')) return true
    if (role === 'buyer' && redirectPath.startsWith('/dashboard/buyer')) return true
    
    return false
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-[linear-gradient(180deg,#C1272D_0%,#D17A39_100%)] rounded-full opacity-20 blur-3xl" />
      </div>
      <header className="p-6 relative z-10">
        <button 
          aria-label="Go back to home"
          onClick={() => router.push('/')} 
          className="bg-white p-2.5 rounded-full shadow-sm hover:shadow-md transition-shadow"
          type="button"
        >
          <ArrowLeft size={20} className="text-reach-navy" />
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center px-8 pb-12 relative z-10">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-reach-navy mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-500">
              Sign in to continue to your account
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-4 border rounded-xl flex items-start gap-3 ${
              isExpired ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
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
                  {error}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:border-reach-red focus:ring-2 focus:ring-reach-red/10 outline-none"
                  placeholder="Enter your email"
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
            </div>

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
                  className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:border-reach-red focus:ring-2 focus:ring-reach-red/10 outline-none"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
                isSubmitting 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-reach-navy text-white hover:bg-reach-navy/90'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/role-selection" className="text-reach-navy font-bold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}