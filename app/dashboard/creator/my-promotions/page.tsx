'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, ApiError } from '@/lib/api/client';
import { 
  Search, 
  Filter,
  BarChart3,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';

export default function MyPromotionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired' | 'stopped'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchPromotions = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await creatorApi.getPromotions({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setPromotions(response.promotions || []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load promotions';
      setError(message);
      console.error('Promotions fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, searchQuery, statusFilter]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paused') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Paused
        </span>
      );
    }
    if (status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Expired
        </span>
      );
    }
    if (status === 'stopped') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          Stopped
        </span>
      );
    }
    // Default to active
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Active
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Promotions</h1>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, status..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-reach-primary focus:border-transparent"
            />
          </div>
          <button
            title="Filter"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Filter Modal */}
        {isFilterOpen && (
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-lg">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">Filter by Status</h3>
              {(['all', 'active', 'paused'] as const).map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={statusFilter === status}
                    onChange={() => {
                      setStatusFilter(status);
                      setIsFilterOpen(false);
                    }}
                    className="w-4 h-4 text-reach-primary focus:ring-reach-primary"
                  />
                  <span className="text-sm text-gray-700 capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load promotions</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchPromotions}
              className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && promotions.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No promotions yet</h3>
            <p className="text-gray-600 mb-6">
              Start promoting properties to see them here
            </p>
            <button
              onClick={() => router.push('/dashboard/creator/properties')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 transition-colors"
            >
              Browse Properties
            </button>
          </div>
        )}

        {/* Promotions Grid */}
        {!isLoading && !error && promotions.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {promotions.map((promotion) => (
              <div
                key={promotion.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Property Image */}
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-gray-100">
                  {promotion.featured_image ? (
                    <Image
                      src={promotion.featured_image}
                      alt={promotion.property_title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="text-gray-300" size={32} />
                    </div>
                  )}
                </div>

                {/* Title & Analytics Icon */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm flex-1 line-clamp-2">
                    {promotion.property_title}
                  </h3>
                  <button
                    title="Analytics"
                    onClick={() => router.push(`/dashboard/creator/analytics?promotion=${promotion.id}`)}
                    className="ml-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                  >
                    <BarChart3 size={16} className="text-gray-600" />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  {getStatusBadge(promotion.status)}
                </div>

                {/* View Details Link */}
                <button
                  onClick={() => router.push(`/dashboard/creator/my-promotions/${promotion.id}`)}
                  className="w-full flex items-center justify-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                >
                  View details
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
