'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, CreatorDashboardData, ApiError } from '@/lib/api/client';
import { 
  ArrowLeft,
  Bell,
  Users,
  MousePointer,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Pause,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

export default function CreatorAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  
  const [promotions, setPromotions] = useState<any[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isPropertySelectorOpen, setIsPropertySelectorOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Get promotion ID from URL params if present
  useEffect(() => {
    const promotionParam = searchParams?.get('promotion');
    if (promotionParam) {
      setSelectedPromotionId(promotionParam);
    }
  }, [searchParams]);

  // Fetch promotions list
  const fetchPromotions = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await creatorApi.getPromotions();
      setPromotions(response.promotions || []);
      
      // Auto-select first promotion if none selected
      if (!selectedPromotionId && response.promotions?.length > 0) {
        setSelectedPromotionId(response.promotions[0].id);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load promotions';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async (promotionId: string) => {
    setIsUpdatingStatus(true);
    try {
      await creatorApi.pausePromotion(promotionId);
      toast.success('Promotion paused successfully');
      await fetchAnalytics();
      await fetchPromotions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to pause promotion';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResume = async (promotionId: string) => {
    setIsUpdatingStatus(true);
    try {
      await creatorApi.resumePromotion(promotionId);
      toast.success('Promotion resumed successfully');
      await fetchAnalytics();
      await fetchPromotions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to resume promotion';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStop = async (promotionId: string) => {
    if (!confirm('Are you sure you want to stop this promotion? This action cannot be undone.')) {
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await creatorApi.stopPromotion(promotionId);
      toast.success('Promotion stopped successfully');
      await fetchAnalytics();
      await fetchPromotions();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to stop promotion';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Fetch analytics for selected promotion
  const fetchAnalytics = async () => {
    if (!selectedPromotionId) return;

    setIsLoadingAnalytics(true);
    try {
      const data = await creatorApi.getPromotionAnalytics(selectedPromotionId, timePeriod);
      // Include promotion status from the selected promotion
      const selectedPromo = promotions.find(p => p.id === selectedPromotionId);
      setAnalytics({
        ...data,
        promotion: selectedPromo ? { status: selectedPromo.status || 'active' } : { status: 'active' },
      });
    } catch (err) {
      console.error('Analytics fetch error:', err);
      const message = err instanceof ApiError ? err.message : 'Failed to load analytics';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [user?.id]);

  useEffect(() => {
    if (selectedPromotionId) {
      fetchAnalytics();
    }
  }, [selectedPromotionId, timePeriod]);

  const selectedPromotion = promotions.find(p => p.id === selectedPromotionId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-reach-bg p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-reach-bg p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load analytics</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchPromotions}
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

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            title="Back"
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <button className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors" title="Notifications" aria-label="Notifications">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>

        {/* White Container */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
          {/* Property Selector */}
          <div className="relative">
            <button
              title="Select property"
              onClick={() => setIsPropertySelectorOpen(!isPropertySelectorOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-700">
                {selectedPromotion ? selectedPromotion.property_title : 'Select property'}
              </span>
              <ChevronDown size={20} className="text-gray-400" />
            </button>
            
            {isPropertySelectorOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                {promotions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No promotions available</div>
                ) : (
                  promotions.map((promotion) => (
                    <button
                      key={promotion.id}
                      title="Select property"
                      onClick={() => {
                        setSelectedPromotionId(promotion.id);
                        setIsPropertySelectorOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <span className="text-gray-900">{promotion.property_title}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {analytics && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Leads Card */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Leads</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.stats.leads.value}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-green-600 font-medium">↗ {analytics.stats.leads.change}%</span>
                    <span className="text-gray-500">From last 30 days</span>
                  </div>
                </div>

                {/* Clicks Card */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <MousePointer size={20} className="text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Clicks</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.stats.clicks.value}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-green-600 font-medium">↗ {analytics.stats.clicks.change}%</span>
                    <span className="text-gray-500">From last 30 days</span>
                  </div>
                </div>
              </div>

              {/* Time Period Tabs */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      timePeriod === period
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {period.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Chart */}
              {isLoadingAnalytics ? (
                <div className="h-64 flex items-center justify-center">
                  <RefreshCw className="animate-spin text-gray-400" size={24} />
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Leads & conversion Activity</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="day" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="conversions" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="inspections" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="leads" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span className="text-gray-600">Leads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span className="text-gray-600">Inspections</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span className="text-gray-600">Conversions</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <button className="flex-1 py-3 px-6 bg-white border-2 border-reach-primary text-reach-primary rounded-full font-medium hover:bg-reach-primary hover:text-white transition-colors">
                  <Pause size={18} className="inline mr-2" />
                  Pause
                </button>
                <button className="flex-1 py-3 px-6 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors">
                  <XCircle size={18} className="inline mr-2" />
                  Stop promotion
                </button>
              </div>
            </>
          )}

          {!analytics && selectedPromotionId && !isLoadingAnalytics && (
            <div className="text-center py-8 text-gray-500">
              No analytics data available for this promotion
            </div>
          )}

          {!selectedPromotionId && promotions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No promotions available. Start promoting properties to see analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

