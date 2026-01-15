'use client';

import { useState, useEffect, Suspense } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { PropertyFilters as PropertyFiltersType, ListingType } from '../../types/property';
import { useRouter, useSearchParams } from 'next/navigation';

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PropertyFiltersType>({
    listingType: (searchParams.get('listingType') as ListingType) || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    bedrooms: searchParams.get('bedrooms') ? Number(searchParams.get('bedrooms')) : undefined,
    city: searchParams.get('city') || undefined,
    state: searchParams.get('state') || undefined,
  });

  const updateURL = (newFilters: PropertyFiltersType, query: string) => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (newFilters.listingType) params.set('listingType', newFilters.listingType);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice.toString());
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice.toString());
    if (newFilters.bedrooms) params.set('bedrooms', newFilters.bedrooms.toString());
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.state) params.set('state', newFilters.state);

    router.push(`/properties?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL(filters, searchQuery);
  };

  const handleFilterChange = (key: keyof PropertyFiltersType, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters, searchQuery);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    router.push('/properties');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery.length > 0;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, location..."
          className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-12 pr-20 outline-none focus:ring-1 ring-reach-red/20"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-50 p-1.5 rounded-lg text-gray-400 hover:text-reach-navy transition-colors"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Listing Type</label>
              <select
                value={filters.listingType || ''}
                onChange={(e) => handleFilterChange('listingType', e.target.value || undefined)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value={ListingType.SALE}>Sale</option>
                <option value={ListingType.RENT}>Rent</option>
                <option value={ListingType.LEAD_GEN}>Lead Gen</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
              <select
                value={filters.bedrooms || ''}
                onChange={(e) => handleFilterChange('bedrooms', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
              <input
                type="number"
                value={filters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="₦0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="₦0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={filters.city || ''}
                onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
                placeholder="Lagos"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={filters.state || ''}
                onChange={(e) => handleFilterChange('state', e.target.value || undefined)}
                placeholder="Lagos"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

