'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, CreatorDashboardData, ApiError } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  MousePointer, 
  Eye, 
  Users, 
  DollarSign,
  Link2,
  Copy,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Building2,
  Plus
} from 'lucide-react';

// ===========================================
// Stat Card Component
// ===========================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  color?: 'navy' | 'green' | 'orange' | 'red';
}

function StatCard({ label, value, icon, change, color = 'navy' }: StatCardProps) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">From last 30 days</p>
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-reach-bg p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="h-64 bg-gray-200 rounded-2xl" />
    </div>
  );
}

// ===========================================
// Error State
// ===========================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-reach-bg p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Dashboard Component
// ===========================================

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Fetch dashboard data from real API
  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const dashboardData = await creatorApi.getDashboard(user.id);
      setData(dashboardData);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load dashboard data';
      setError(message);
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  // Copy link to clipboard
  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }


  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-6 space-y-6">
        {/* Header is handled by DashboardShell */}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Impressions"
            value={data?.performance.total_impressions.toLocaleString() || '0'}
            icon={<Eye size={20} className="text-gray-600" />}
            color="navy"
          />
          <StatCard
            label="Total Clicks"
            value={data?.performance.total_clicks.toLocaleString() || '0'}
            icon={<MousePointer size={20} className="text-gray-600" />}
            color="navy"
          />
          <StatCard
            label="Leads Generated"
            value={data?.performance.total_leads || 0}
            icon={<Users size={20} className="text-gray-600" />}
            color="navy"
          />
          <StatCard
            label="Total Earned"
            value={formatCurrency(data?.earnings.total_earned || 0)}
            icon={<DollarSign size={20} className="text-gray-600" />}
            color="navy"
          />
        </div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.1 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
              <p className="text-xl font-bold text-gray-900">
                {data?.performance.conversion_rate.toFixed(1) || 0}%
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Active Properties</p>
              <p className="text-xl font-bold text-gray-900">
                {data?.promoting.active_properties || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Wallet Balance</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(data?.earnings.wallet_balance || 0)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Active Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Tracking Links</h2>
            <button
              onClick={() => router.push('/dashboard/creator/links')}
              className="text-sm text-reach-primary font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          
          {(!data?.performance.by_property || data.performance.by_property.length === 0) ? (
            <div className="text-center py-8">
              <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No tracking links yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Generate links for properties to start earning commissions
              </p>
              <button
                onClick={() => router.push('/dashboard/creator/properties')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
              >
                <Plus size={16} />
                Find Properties to Promote
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.performance.by_property.slice(0, 5).map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{link.property_title}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{link.impressions} views</span>
                      <span>{link.clicks} clicks</span>
                      <span>{link.leads} leads</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(link.tracking_url)}
                      className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
                      title="Copy link"
                    >
                      {copiedLink === link.tracking_url ? (
                        <span className="text-xs">Copied!</span>
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <a
                      href={link.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
                      title="Open link"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Earnings Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Earnings Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Total Earned</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(data?.earnings.total_earned || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Pending</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(data?.earnings.pending || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Available</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(data?.earnings.wallet_balance || 0)}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/wallet')}
            className="w-full mt-4 py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 transition-colors"
          >
            View Wallet & Withdraw
          </button>
        </motion.div>

        {/* Quick Actions - Desktop Only */}
        <div className="hidden lg:block bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard/creator/properties')}
              className="flex items-center gap-2 px-4 py-2.5 bg-reach-primary text-white rounded-xl hover:bg-reach-primary/90 transition-colors"
            >
              <Building2 size={18} />
              Find Properties
            </button>
            <button
              onClick={() => router.push('/dashboard/creator/links')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Link2 size={18} />
              View All Links
            </button>
            <button
              onClick={() => router.push('/dashboard/creator/analytics')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <TrendingUp size={18} />
              View Analytics
            </button>
          </div>
        </div>

        {/* Floating Action Button (Mobile) */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          onClick={() => router.push('/dashboard/creator/properties')}
          className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-reach-primary text-white rounded-full shadow-xl flex items-center justify-center z-30"
          aria-label="View properties"
          title="View properties"
        >
          <Plus size={24} />
        </motion.button>
      </div>
    </div>
  );
}


