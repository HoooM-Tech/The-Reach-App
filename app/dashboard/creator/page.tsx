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
  Coins,
  Building2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// ===========================================
// TypeScript Interfaces
// ===========================================

interface StatCardProps {
  title: string;
  value: string | number;
  percentageChange?: number;
  timeframe: string;
  icon: React.ReactNode;
}

interface PromotionCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  status: 'active' | 'inactive' | 'pending';
  onViewDetails: (id: string) => void;
}

interface PromotionsSectionProps {
  promotions: PromotionCardProps[];
  onSeeAll: () => void;
  onViewDetails: (id: string) => void;
}

interface PrimaryCTAButtonProps {
  label: string;
  onClick: () => void;
}

// ===========================================
// Stat Card Component
// ===========================================

function StatCard({ title, value, percentageChange, timeframe, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {percentageChange !== undefined && percentageChange > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">
                {percentageChange > 0 ? '+' : ''}{percentageChange}%
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">{timeframe}</p>
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Stats Grid Component
// ===========================================

interface StatsGridProps {
  stats: StatCardProps[];
}

function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

// ===========================================
// Promotion Card Component
// ===========================================

function PromotionCard({ id, title, imageUrl, status, onViewDetails }: PromotionCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex-shrink-0 w-4/5 sm:w-64 md:w-72 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {imageUrl ? (
        <div className="relative aspect-[16/9] bg-gray-100">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="relative aspect-[16/9] bg-gray-100 flex items-center justify-center">
          <Building2 className="w-12 h-12 text-gray-300" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-gray-600">{getStatusLabel()}</span>
          </div>
          <button
            onClick={() => onViewDetails(id)}
            className="text-sm text-orange-500 font-medium hover:underline flex items-center gap-1"
          >
            View details
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Promotions Section Component
// ===========================================

function PromotionsSection({ promotions, onSeeAll, onViewDetails }: PromotionsSectionProps) {
  if (!promotions || promotions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-gray-900">Active Promotions</h2>
        <button
          onClick={onSeeAll}
          className="text-sm text-reach-primary font-medium hover:underline"
        >
          See All
        </button>
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-4 pb-2">
          {promotions.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              {...promotion}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Primary CTA Button Component
// ===========================================

function PrimaryCTAButton({ label, onClick }: PrimaryCTAButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 bg-reach-primary text-white rounded-2xl font-semibold hover:bg-reach-primary/90 transition-colors shadow-sm"
    >
      {label}
    </button>
  );
}

// ===========================================
// Dashboard Skeleton Component
// ===========================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#FFF5F5] p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>

      {/* Promotions Skeleton */}
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-40" />
        <div className="flex gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="w-4/5 sm:w-64 md:w-72 h-48 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* CTA Button Skeleton */}
      <div className="h-14 bg-gray-200 rounded-2xl" />
    </div>
  );
}

// ===========================================
// Error State Component
// ===========================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[#FFF5F5] p-4 sm:p-6">
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
// Data Hooks (Abstracted for Backend Integration)
// ===========================================

interface UseDashboardDataReturn {
  data: CreatorDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useDashboardData(userId?: string): UseDashboardDataReturn {
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const dashboardData = await creatorApi.getDashboard(userId);
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
    fetchData();
  }, [userId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

interface UseDashboardStatsReturn {
  stats: StatCardProps[];
}

function useDashboardStats(data: CreatorDashboardData | null): UseDashboardStatsReturn {
  const stats: StatCardProps[] = React.useMemo(() => {
    if (!data) return [];

    // Abstracted function for calculating percentage changes
    // TODO: Backend should provide percentage_change fields in the API response
    // Expected API response structure:
    // {
    //   performance: {
    //     total_impressions: number,
    //     impressions_change: number, // percentage change from last 30 days
    //     total_clicks: number,
    //     clicks_change: number,
    //     total_leads: number,
    //     leads_change: number,
    //     ...
    //   },
    //   earnings: {
    //     total_earned: number,
    //     earnings_change: number,
    //     ...
    //   }
    // }
    const getPercentageChange = (currentValue: number, changeValue?: number): number | undefined => {
      // When backend provides change values, use them directly:
      // return changeValue;
      // For now, return undefined - component will gracefully omit the indicator
      return changeValue;
    };

    return [
      {
        title: 'Impressions',
        value: data.performance.total_impressions.toLocaleString(),
        percentageChange: getPercentageChange(
          data.performance.total_impressions,
          (data.performance as any).impressions_change
        ),
        timeframe: 'From last 30 days',
        icon: <Eye size={20} className="text-gray-600" />,
      },
      {
        title: 'Clicks',
        value: data.performance.total_clicks.toLocaleString(),
        percentageChange: getPercentageChange(
          data.performance.total_clicks,
          (data.performance as any).clicks_change
        ),
        timeframe: 'From last 30 days',
        icon: <MousePointer size={20} className="text-gray-600" />,
      },
      {
        title: 'Leads',
        value: data.performance.total_leads,
        percentageChange: getPercentageChange(
          data.performance.total_leads,
          (data.performance as any).leads_change
        ),
        timeframe: 'From last 30 days',
        icon: <Users size={20} className="text-gray-600" />,
      },
      {
        title: 'Earnings',
        value: data.earnings.total_earned.toLocaleString(),
        percentageChange: getPercentageChange(
          data.earnings.total_earned,
          (data.earnings as any).earnings_change
        ),
        timeframe: 'From last 30 days',
        icon: <Coins size={20} className="text-gray-600" />,
      },
    ];
  }, [data]);

  return { stats };
}

interface UsePromotionsReturn {
  promotions: PromotionCardProps[];
}

function usePromotions(data: CreatorDashboardData | null): UsePromotionsReturn {
  const promotions: PromotionCardProps[] = React.useMemo(() => {
    if (!data || !data.promoting.properties) return [];

    return data.promoting.properties.map((property: any) => ({
      id: property.id || property.property_id || '',
      title: property.title || property.property_title || 'Untitled Property',
      imageUrl: property.media?.[0]?.url || property.image_url,
      status: property.status === 'verified' || property.verification_status === 'verified' ? 'active' : 'pending',
      onViewDetails: () => {},
    }));
  }, [data]);

  return { promotions };
}

// ===========================================
// Main Dashboard Component
// ===========================================

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data, isLoading, error, refetch } = useDashboardData(user?.id);
  const { stats } = useDashboardStats(data);
  const { promotions } = usePromotions(data);

  const handleSeeAllPromotions = () => {
    router.push('/dashboard/creator/properties');
  };

  const handleViewPromotionDetails = (id: string) => {
    router.push(`/property/${id}`);
  };

  const handleBrowseProperties = () => {
    router.push('/dashboard/creator/properties');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5]">
        <DashboardSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  // No data state
  if (!data) {
  return (
      <div className="min-h-screen bg-[#FFF5F5] p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No dashboard data available</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F5] pb-24 lg:pb-6">
      <div className="px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <StatsGrid stats={stats} />

        {/* Active Promotions */}
        {promotions.length > 0 && (
          <PromotionsSection
            promotions={promotions}
            onSeeAll={handleSeeAllPromotions}
            onViewDetails={handleViewPromotionDetails}
          />
        )}

        {/* Primary CTA */}
        <PrimaryCTAButton
          label="Browse Properties"
          onClick={handleBrowseProperties}
        />
      </div>
    </div>
  );
}
