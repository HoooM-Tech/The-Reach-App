'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { buyerApi, BuyerDashboardData, ApiError } from '@/lib/api/client';
import { 
  Heart, 
  Building2,
  MapPin,
  Bed,
  Bath,
  RefreshCw,
  AlertCircle,
  Search
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Property Card Component
// ===========================================

interface PropertyCardProps {
  property: any;
  onClick: () => void;
}

function PropertyCard({ property, onClick }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const primaryImage = property.media?.[0]?.url;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all text-left group"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-16 h-16 text-gray-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Heart className="w-5 h-5 text-[#E54D4D] fill-[#E54D4D]" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-[#E54D4D] transition-colors">
          {property.title}
        </h3>

        {property.location && (
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin size={14} />
            <span className="line-clamp-1">
              {property.location.city}, {property.location.state}
            </span>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500">
          {property.bedrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bed size={14} />
              <span>{property.bedrooms} beds</span>
            </div>
          )}
          {property.bathrooms !== undefined && (
            <div className="flex items-center gap-1">
              <Bath size={14} />
              <span>{property.bathrooms} baths</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-lg font-bold text-[#E54D4D]">
            {formatPrice(property.asking_price || 0)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function BuyerSavedPage() {
  const router = useRouter();
  const { user } = useUser();
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved properties from dashboard API
  const fetchSavedProperties = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const dashboard = await buyerApi.getDashboard(user.id);
      // Note: saved_properties might be empty initially
      // This would need to be implemented with a save/unsave feature
      setSavedProperties(dashboard.saved_properties || []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load saved properties';
      setError(message);
      console.error('Saved properties fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedProperties();
  }, [user?.id]);

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Properties</h1>
        <p className="text-gray-500 text-sm mt-1">
          {savedProperties.length} {savedProperties.length === 1 ? 'property' : 'properties'} saved
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load saved properties</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchSavedProperties}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && savedProperties.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved properties yet</h3>
          <p className="text-gray-500 mb-6">
            Save properties you&apos;re interested in to view them here later
          </p>
          <button
            onClick={() => router.push('/properties')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E54D4D] text-white rounded-xl font-medium"
          >
            <Search size={18} />
            Browse Properties
          </button>
        </div>
      )}

      {/* Properties Grid */}
      {!isLoading && !error && savedProperties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedProperties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => router.push(`/dashboard/buyer/properties/${property.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

