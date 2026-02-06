'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import Image from 'next/image';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Star, 
  MoreHorizontal,
  Building2,
  Loader2,
  Heart,
  Share2,
  Flag
} from 'lucide-react';
import { SearchFilterModal } from '@/components/buyer/SearchFilterModal';

// ===========================================
// Types
// ===========================================

interface Property {
  id: string;
  title: string;
  asking_price: number;
  location?: {
    address?: string;
    city?: string;
    state?: string;
  };
  property_type?: string;
  bedrooms?: number;
  media?: Array<{ id: string; url: string; type: string }>;
  rating?: number;
  reviewCount?: number;
}

interface FilterState {
  location: string;
  propertyType: string;
  priceMin: number;
  priceMax: number;
}

// ===========================================
// Property Options Menu
// ===========================================

function PropertyOptionsMenu({
  isOpen,
  onClose,
  onSave,
  onShare,
  onReport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onShare: () => void;
  onReport: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden animate-scaleIn">
        <button
          onClick={() => { onSave(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <Heart size={18} className="text-gray-500" />
          <span className="text-gray-700">Save property</span>
        </button>
        <button
          onClick={() => { onShare(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <Share2 size={18} className="text-gray-500" />
          <span className="text-gray-700">Share</span>
        </button>
        <button
          onClick={() => { onReport(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors text-red-600"
        >
          <Flag size={18} />
          <span>Report</span>
        </button>
      </div>
    </>
  );
}

// ===========================================
// Property Card Component
// ===========================================

function BuyerPropertyCard({ 
  property, 
  onClick,
}: { 
  property: Property;
  onClick: () => void;
}) {
  const [showOptions, setShowOptions] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const primaryImage = property.media?.find(m => m.type === 'IMAGE' || m.type === 'image') || property.media?.[0];
  const locationText = property.location 
    ? [property.location.address, property.location.city, property.location.state].filter(Boolean).join(', ')
    : 'Location not available';

  const rating = property.rating || 4.8;
  const reviewCount = property.reviewCount || 20;

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Save property:', property.id);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/property/${property.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    console.log('Report property:', property.id);
  };

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-transform active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Property Image */}
      <div className="relative aspect-[4/3]">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Building2 size={48} className="text-gray-300" />
          </div>
        )}
        
        {/* Options Menu Button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(!showOptions);
            }}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50"
            aria-label="More options"
          >
            <MoreHorizontal size={18} className="text-gray-600" />
          </button>
          <PropertyOptionsMenu
            isOpen={showOptions}
            onClose={() => setShowOptions(false)}
            onSave={handleSave}
            onShare={handleShare}
            onReport={handleReport}
          />
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Title and Rating */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 leading-tight line-clamp-1">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="text-sm text-gray-600">{rating}({reviewCount})</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-[#E54D4D] mb-2">
          <MapPin size={14} />
          <p className="text-sm truncate">{locationText}</p>
        </div>

        {/* Price */}
        <p className="font-bold text-lg text-gray-900">
          {formatPrice(property.asking_price || 0)}
        </p>
      </div>
    </div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function PropertySkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-6 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

// ===========================================
// Main Buyer Dashboard Page
// ===========================================

export default function BuyerDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const searchParams = useSearchParams();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    location: searchParams.get('location') || '',
    propertyType: searchParams.get('property_type') || '',
    priceMin: Number(searchParams.get('min_price')) || 0,
    priceMax: Number(searchParams.get('max_price')) || 0,
  });
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch properties from API
  const fetchProperties = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('limit', '10');
      
      if (searchQuery) params.set('location', searchQuery);
      if (filters.location) params.set('location', filters.location);
      if (filters.propertyType) params.set('property_type', filters.propertyType);
      if (filters.priceMin > 0) params.set('min_price', filters.priceMin.toString());
      if (filters.priceMax > 0) params.set('max_price', filters.priceMax.toString());

      const response = await fetch(`/api/properties/browse?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }

      const data = await response.json();
      
      if (reset) {
        setProperties(data.properties || []);
      } else {
        setProperties(prev => [...prev, ...(data.properties || [])]);
      }
      
      setHasMore(data.pagination?.page < data.pagination?.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [searchQuery, filters]);

  // Initial fetch
  useEffect(() => {
    fetchProperties(1, true);
  }, [fetchProperties]);

  // Setup infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchProperties(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page, fetchProperties]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProperties(1, true);
  };

  // Handle filter apply
  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setIsFilterOpen(false);
    setTimeout(() => fetchProperties(1, true), 100);
  };

  // Handle property click
  const handlePropertyClick = (propertyId: string) => {
    router.push(`/dashboard/buyer/properties/${propertyId}`);
  };

  return (
    <div className="min-h-screen bg-reach-light">
      {/* Search Bar Section */}
      <div className="bg-reach-light px-4 sm:px-6 lg:px-8 py-3 mt-5 ">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search 
                size={20} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Location.."
                className="w-full bg-white border border-gray-100 rounded-xl py-3 sm:py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#E54D4D]/20 focus:border-[#E54D4D] text-gray-900 placeholder:text-gray-400 text-sm sm:text-base"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="p-3 sm:p-3.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
              aria-label="Filter"
            >
              <SlidersHorizontal size={20} className="text-gray-600" />
            </button>
          </form>
        </div>
      </div>

      {/* Properties Feed */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        <div className="max-w-7xl mx-auto">
        {isLoading ? (
          // Loading skeletons - responsive grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <PropertySkeleton key={i} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          // Empty state
          <div className="text-center py-12 sm:py-16">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({
                  location: '',
                  propertyType: '',
                  priceMin: 0,
                  priceMax: 0,
                });
                fetchProperties(1, true);
              }}
              className="px-4 py-2 bg-[#E54D4D] text-white rounded-lg hover:bg-[#d43d3d] transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Property Cards - responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {properties.map((property) => (
                <BuyerPropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => handlePropertyClick(property.id)}
                />
              ))}
            </div>

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-4">
              {isLoadingMore && (
                <Loader2 size={24} className="animate-spin text-[#E54D4D]" />
              )}
            </div>

            {/* End of list */}
            {!hasMore && properties.length > 0 && (
              <p className="text-center text-gray-400 py-4">
                You&apos;ve seen all properties
              </p>
            )}
          </>
        )}
        </div>
      </div>

      {/* Filter Modal */}
      <SearchFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        initialFilters={filters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
