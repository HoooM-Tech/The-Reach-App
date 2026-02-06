'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError, getAccessToken, Property as ApiProperty } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  Star,
  User
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Types
// ===========================================

interface Property extends Omit<ApiProperty, 'asking_price'> {
  asking_price?: number;
  rating?: number;
  review_count?: number;
}

interface PropertyStats {
  views: number;
  leads: number;
}

interface PropertyWithStats extends Property {
  stats?: PropertyStats;
}

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string; icon: React.ReactNode }> = {
    verified: {
      label: 'Verified',
      bgColor: 'bg-emerald-500',
      textColor: 'text-white',
      dotColor: 'bg-emerald-600',
      icon: <CheckCircle size={12} />
    },
    pending_verification: {
      label: 'Pending',
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      dotColor: 'bg-orange-600',
      icon: <Clock size={12} />
    },
    submitted: {
      label: 'Pending',
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      dotColor: 'bg-orange-600',
      icon: <Clock size={12} />
    },
    draft: {
      label: 'Draft',
      bgColor: 'bg-gray-500',
      textColor: 'text-white',
      dotColor: 'bg-gray-600',
      icon: <FileEdit size={12} />
    },
    rejected: {
      label: 'Rejected',
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      dotColor: 'bg-red-600',
      icon: <XCircle size={12} />
    },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}

// ===========================================
// Property Card Component
// ===========================================

interface PropertyCardProps {
  property: PropertyWithStats;
  onEdit: () => void;
  onView: () => void;
}

function PropertyCard({ property, onEdit, onView }: PropertyCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `₦${(price / 1000000).toFixed(0)}M`;
    }
    if (price >= 1000) {
      return `₦${(price / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const primaryImage = property.media?.[0]?.url;
  const views = property.stats?.views || 0;
  const leads = property.stats?.leads || 0;
  const rating = property.rating || 4.8;
  const reviewCount = property.review_count || 20;

  // Get location string
  const locationString = property.location?.address 
    ? property.location.address
    : property.location?.city && property.location?.state
    ? `${property.location.city}, ${property.location.state}`
    : property.location?.city || property.location?.state || 'Location not specified';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center">
                <FileEdit className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        )}
        {/* Status Badge - Top Left */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={property.verification_status || property.status || 'draft'} />
        </div>
        {/* More Options - Top Right */}
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
              aria-label="More options"
              title="More options"
            >
              <MoreVertical size={16} className="text-gray-700" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 min-w-max max-w-screen-sm"
                  >
                    <button
                      onClick={() => { onView(); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title and Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 text-base">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={14} className="text-orange-500 fill-orange-500" />
            <span className="text-sm text-gray-600">
              {rating}({reviewCount})
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-1.5 text-gray-500 text-sm">
          <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">
            {locationString}
          </span>
        </div>

        {/* Price */}
        <p className="text-lg font-bold text-gray-900 pt-1">
          {formatPrice(property.asking_price || 0)}
        </p>

        {/* Footer Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Eye size={14} className="text-gray-400" />
            <span>{views}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-gray-400" />
            <span>{leads}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperPropertiesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertyWithStats[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState<Set<string>>(new Set());

  // Fetch stats for a single property
  const fetchPropertyStats = useCallback(async (propertyId: string): Promise<PropertyStats> => {
    try {
      const token = getAccessToken();
      const response = await fetch(`/api/properties/${propertyId}/stats`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          views: data.views || 0,
          leads: data.leads || 0,
        };
      }
      return { views: 0, leads: 0 };
    } catch (err) {
      console.warn(`Failed to fetch stats for property ${propertyId}:`, err);
      return { views: 0, leads: 0 };
    }
  }, []);

  // Fetch properties from real API
  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await developerApi.getMyProperties();
      const propertiesList = response.properties || [];
      
      // Fetch stats for all properties in parallel
      setLoadingStats(new Set(propertiesList.map((p: ApiProperty) => p.id)));
      
      const propertiesWithStats = await Promise.all(
        propertiesList.map(async (property: ApiProperty) => {
          const stats = await fetchPropertyStats(property.id);
          return {
            ...property,
            stats,
          } as PropertyWithStats;
        })
      );

      setProperties(propertiesWithStats);
      setLoadingStats(new Set());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(message);
      console.error('Properties fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPropertyStats]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Filter properties based on tab and search
  useEffect(() => {
    let filtered = [...properties];

    // Filter by status
    if (activeTab !== 'All') {
      filtered = filtered.filter(p => {
        const status = (p.verification_status || p.status || '').toLowerCase();
        if (activeTab === 'Verified') return status === 'verified';
        if (activeTab === 'Rejected') return status === 'rejected';
        if (activeTab === 'Pending') return status === 'pending_verification' || status === 'submitted';
        if (activeTab === 'Draft') return status === 'draft';
        return true;
      });
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.location?.city?.toLowerCase().includes(query) ||
        p.location?.state?.toLowerCase().includes(query) ||
        p.location?.address?.toLowerCase().includes(query) ||
        (p.verification_status || p.status || '').toLowerCase().includes(query)
      );
    }

    setFilteredProperties(filtered);
  }, [properties, activeTab, searchQuery]);

  // Tab counts
  const getCounts = () => {
    const counts: Record<string, number> = { All: properties.length };
    properties.forEach(p => {
      const status = (p.verification_status || p.status || '').toLowerCase();
      if (status === 'verified') counts.Verified = (counts.Verified || 0) + 1;
      else if (status === 'rejected') counts.Rejected = (counts.Rejected || 0) + 1;
      else if (status === 'pending_verification' || status === 'submitted') counts.Pending = (counts.Pending || 0) + 1;
      else if (status === 'draft') counts.Draft = (counts.Draft || 0) + 1;
    });
    return counts;
  };

  const counts = getCounts();

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, status..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-reach-navy/20 focus:border-reach-navy text-sm"
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Filter"
          >
            <Filter size={20} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
          {['All', 'Draft', 'Verified', 'Rejected', 'Pending'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab} {counts[tab] !== undefined && counts[tab] > 0 ? counts[tab] : ''}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center"
          >
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load properties</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchProperties()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredProperties.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="bg-white rounded-2xl p-12 text-center border border-gray-100 max-w-md mx-auto"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <FileEdit className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Properties listed will appear here.
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              To get started click on the &quot;Add property button&quot;
            </p>
            <button
              onClick={() => router.push('/dashboard/developer/properties/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 transition-colors"
            >
              <Plus size={18} />
              Add Property
            </button>
          </motion.div>
        )}

        {/* Properties Grid */}
        {!isLoading && !error && filteredProperties.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            <AnimatePresence>
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.3,
                    delay: prefersReducedMotion ? 0 : index * 0.05,
                  }}
                >
                  <PropertyCard
                    property={property}
                    onView={() => router.push(`/dashboard/developer/properties/${property.id}`)}
                    onEdit={() => router.push(`/dashboard/developer/properties/${property.id}/edit`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        onClick={() => router.push('/dashboard/developer/properties/new')}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 w-14 h-14 lg:w-16 lg:h-16 bg-reach-primary text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-50 transition-shadow"
        aria-label="Add new property"
      >
        <Plus size={24} className="lg:w-7 lg:h-7" />
      </motion.button>
    </div>
  );
}
