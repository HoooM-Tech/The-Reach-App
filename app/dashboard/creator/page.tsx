'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, CreatorDashboardData, ApiError } from '@/lib/api/client';
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
  trend?: string;
  gradient?: boolean;
}

function StatCard({ label, value, icon, trend, gradient }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-5 ${gradient 
      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
      : 'bg-white/10 backdrop-blur-sm border border-white/10 text-white'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${gradient ? 'text-white/80' : 'text-white/60'} mb-1`}>{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${gradient ? 'bg-white/20' : 'bg-white/10'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-white/10 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white/10 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-white/10 rounded-2xl" />
    </div>
  );
}

// ===========================================
// Error State
// ===========================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6">
      <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Failed to load dashboard</h3>
        <p className="text-white/70 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0A1628] rounded-lg hover:bg-white/90"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
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

  // Get tier badge
  const getTierBadge = (tier: number) => {
    const tiers: Record<number, { label: string; color: string }> = {
      1: { label: 'Bronze', color: 'bg-amber-600' },
      2: { label: 'Silver', color: 'bg-gray-400' },
      3: { label: 'Gold', color: 'bg-yellow-500' },
      4: { label: 'Platinum', color: 'bg-purple-600' },
    };
    return tiers[tier] || tiers[1];
  };

  const tierInfo = getTierBadge(data?.tier || 1);

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-white/60 text-sm">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Creator'}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${tierInfo.color}`}>
              {tierInfo.label}
            </span>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/creator/properties')}
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          <Building2 size={18} />
          Find Properties
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Impressions"
          value={data?.performance.total_impressions.toLocaleString() || '0'}
          icon={<Eye size={20} />}
          gradient
        />
        <StatCard
          label="Total Clicks"
          value={data?.performance.total_clicks.toLocaleString() || '0'}
          icon={<MousePointer size={20} />}
        />
        <StatCard
          label="Leads Generated"
          value={data?.performance.total_leads || 0}
          icon={<Users size={20} />}
        />
        <StatCard
          label="Total Earned"
          value={formatCurrency(data?.earnings.total_earned || 0)}
          icon={<DollarSign size={20} />}
        />
      </div>

      {/* Performance Summary */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">Performance Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-white/60 mb-1">Conversion Rate</p>
            <p className="text-xl font-bold text-white">
              {data?.performance.conversion_rate.toFixed(1) || 0}%
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-white/60 mb-1">Active Properties</p>
            <p className="text-xl font-bold text-white">
              {data?.promoting.active_properties || 0}
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-white/60 mb-1">Wallet Balance</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(data?.earnings.wallet_balance || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Active Links */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Tracking Links</h2>
          <button
            onClick={() => router.push('/dashboard/creator/links')}
            className="text-sm text-purple-400 font-medium hover:underline flex items-center gap-1"
          >
            View All <ArrowRight size={14} />
          </button>
        </div>
        
        {(!data?.performance.by_property || data.performance.by_property.length === 0) ? (
          <div className="text-center py-8">
            <Link2 className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 mb-2">No tracking links yet</p>
            <p className="text-sm text-white/40 mb-4">
              Generate links for properties to start earning commissions
            </p>
            <button
              onClick={() => router.push('/dashboard/creator/properties')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg"
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
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{link.property_title}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-white/60">
                    <span>{link.impressions} views</span>
                    <span>{link.clicks} clicks</span>
                    <span>{link.leads} leads</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(link.tracking_url)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
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
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
                    title="Open link"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Earnings Overview */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">Earnings Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-white/60 mb-1">Total Earned</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(data?.earnings.total_earned || 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-500/20 rounded-xl">
            <p className="text-sm text-white/60 mb-1">Pending</p>
            <p className="text-xl font-bold text-orange-400">
              {formatCurrency(data?.earnings.pending || 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-emerald-500/20 rounded-xl">
            <p className="text-sm text-white/60 mb-1">Available</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(data?.earnings.wallet_balance || 0)}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/creator/wallet')}
          className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          View Wallet & Withdraw
        </button>
      </div>

      {/* Floating Action Button (Mobile) */}
      <button
        type="button"
        onClick={() => router.push('/dashboard/creator/properties')}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30"
        aria-label="View properties"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}


