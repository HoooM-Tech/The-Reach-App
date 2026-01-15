'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, CreatorDashboardData, ApiError } from '@/lib/api/client';
import { 
  TrendingUp, 
  Eye,
  MousePointer,
  Users,
  RefreshCw,
  AlertCircle,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CreatorAnalyticsPage() {
  const { user } = useUser();
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const dashboard = await creatorApi.getDashboard(user.id);
      setData(dashboard);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load analytics';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load analytics</h3>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const performance = data?.performance || {
    total_impressions: 0,
    total_clicks: 0,
    total_leads: 0,
    conversion_rate: 0,
    by_property: [],
  };

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-white/60 text-sm mt-1">
          Track your performance and optimize your promotions
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Impressions</span>
            <Eye className="text-white/40" size={18} />
          </div>
          <p className="text-2xl font-bold text-white">
            {performance.total_impressions.toLocaleString()}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Clicks</span>
            <MousePointer className="text-white/40" size={18} />
          </div>
          <p className="text-2xl font-bold text-white">
            {performance.total_clicks.toLocaleString()}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Leads</span>
            <Users className="text-white/40" size={18} />
          </div>
          <p className="text-2xl font-bold text-white">
            {performance.total_leads}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Conversion Rate</span>
            <TrendingUp className="text-white/40" size={18} />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {performance.conversion_rate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Performance by Property */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4">Performance by Property</h2>
        
        {performance.by_property.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">No performance data yet</p>
            <p className="text-sm text-white/40">Generate links and start promoting to see analytics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {performance.by_property.map((link) => (
              <div
                key={link.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <h3 className="font-medium text-white mb-3">{link.property_title}</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Impressions</p>
                    <p className="text-sm font-semibold text-white">{link.impressions}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Clicks</p>
                    <p className="text-sm font-semibold text-white">{link.clicks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Leads</p>
                    <p className="text-sm font-semibold text-white">{link.leads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Conversion</p>
                    <p className="text-sm font-semibold text-emerald-400">
                      {link.conversion_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

