'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { buyerApi, ApiError } from '@/lib/api/client';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Building2, 
  Bed, 
  Bath,
  RefreshCw,
  AlertCircle,
  X,
  ChevronLeft
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

  const getListingTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      sale: { label: 'For Sale', color: 'bg-emerald-100 text-emerald-700' },
      rent: { label: 'For Rent', color: 'bg-blue-100 text-blue-700' },
      lead_generation: { label: 'Lead Gen', color: 'bg-purple-100 text-purple-700' },
    };
    return types[type?.toLowerCase()] || types.sale;
  };

  const listingBadge = getListingTypeBadge(property.listing_type);
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
        <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${listingBadge.color}`}>
          {listingBadge.label}
        </span>
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
// Filter Modal Component
// ===========================================

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

interface FilterState {
  listingType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  city: string;
  state: string;
}

function FilterModal({ isOpen, onClose, filters, onApply }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl lg:rounded-2xl w-full lg:w-[480px] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Listing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Listing Type</label>
            <div className="flex gap-2">
              {['all', 'sale', 'rent'].map(type => (
                <button
                  key={type}
                  onClick={() => setLocalFilters({ ...localFilters, listingType: type === 'all' ? '' : type })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (localFilters.listingType === type) || (type === 'all' && !localFilters.listingType)
                      ? 'bg-[#0A1628] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'sale' ? 'For Sale' : 'For Rent'}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.minPrice}
                onChange={e => setLocalFilters({ ...localFilters, minPrice: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
              />
              <input
                type="number"
                placeholder="Max"
                value={localFilters.maxPrice}
                onChange={e => setLocalFilters({ ...localFilters, maxPrice: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
              />
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
            <div className="flex gap-2">
              {['Any', '1', '2', '3', '4', '5+'].map(beds => (
                <button
                  key={beds}
                  onClick={() => setLocalFilters({ ...localFilters, bedrooms: beds === 'Any' ? '' : beds.replace('+', '') })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (localFilters.bedrooms === beds.replace('+', '')) || (beds === 'Any' && !localFilters.bedrooms)
                      ? 'bg-[#0A1628] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {beds}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              placeholder="City"
              value={localFilters.city}
              onChange={e => setLocalFilters({ ...localFilters, city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20 mb-2"
            />
            <input
              type="text"
              placeholder="State"
              value={localFilters.state}
              onChange={e => setLocalFilters({ ...localFilters, state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white p-4 border-t flex gap-3">
          <button
            onClick={() => {
              setLocalFilters({ listingType: '', minPrice: '', maxPrice: '', bedrooms: '', city: '', state: '' });
            }}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              onApply(localFilters);
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-[#E54D4D] text-white rounded-xl font-medium hover:bg-[#E54D4D]/90"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Properties Page
// ===========================================

export default function PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => ({
    listingType: searchParams.get('listingType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    city: searchParams.get('city') || '',
    state: searchParams.get('state') || '',
  }));

  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize filters string to prevent unnecessary re-renders
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);

  // Fetch properties from real API
  const fetchProperties = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setError(null);

    try {
      const queryParams: Record<string, string> = {};
      if (searchQuery) queryParams.q = searchQuery;
      if (filters.listingType) queryParams.listing_type = filters.listingType;
      if (filters.minPrice) queryParams.min_price = filters.minPrice;
      if (filters.maxPrice) queryParams.max_price = filters.maxPrice;
      if (filters.bedrooms) queryParams.bedrooms = filters.bedrooms;
      if (filters.city) queryParams.city = filters.city;
      if (filters.state) queryParams.state = filters.state;

      const response = await buyerApi.browseProperties(queryParams);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setProperties(response.properties || []);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(message);
      console.error('Properties fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchQuery, filtersString]);

  useEffect(() => {
    fetchProperties();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProperties]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/properties?${params.toString()}`);
  };

  // Handle filter apply
  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    router.push(`/properties?${params.toString()}`);
  };

  // Active filters count
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#FDFBFA]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft size={20} />
            </button>
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E54D4D]/20 focus:border-[#E54D4D]"
              />
            </form>
            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <SlidersHorizontal size={20} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E54D4D] text-white text-xs rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Properties
            {!isLoading && (
              <span className="text-base font-normal text-gray-500 ml-2">
                ({properties.length} found)
              </span>
            )}
          </h1>
        </div>

        {/* Loading State */}
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

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load properties</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchProperties}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg hover:bg-[#E54D4D]/90"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && properties.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters({ listingType: '', minPrice: '', maxPrice: '', bedrooms: '', city: '', state: '' });
                router.push('/properties');
              }}
              className="text-[#E54D4D] font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Properties Grid */}
        {!isLoading && !error && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={() => router.push(`/property/${property.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
