'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, ApiError } from '@/lib/api/client';
import { getCreatorCommissionRate } from '@/lib/utils/constants';
import { 
  Building2, 
  MapPin, 
  Search,
  Filter,
  X,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  Share2,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DualRangeSlider } from '@/components/ui/DualRangeSlider';

// ===========================================
// Types
// ===========================================

interface Property {
  id: string;
  title: string;
  asking_price: number;
  location?: {
    city?: string;
    state?: string;
    address?: string;
  };
  property_type?: string;
  listing_type?: string;
  media?: Array<{ url: string; type: string }>;
  rating?: number;
  review_count?: number;
  verification_status?: string;
  status?: string;
}

interface FilterState {
  location: string;
  category: string[];
  priceRange: [number, number];
}

// ===========================================
// Property Card Component
// ===========================================

interface PropertyCardProps {
  property: Property;
  onPromote: (property: Property) => void;
}

function PropertyCard({ property, onPromote }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `₦${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `₦${(price / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const primaryImage = property.media?.[0]?.url;
  const address = property.location?.address || 
    `${property.location?.city || ''}, ${property.location?.state || ''}`.trim();

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Image */}
      <div className="relative aspect-[16/9] bg-gray-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover rounded-t-2xl"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{property.title}</h3>
          {property.rating && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-gray-500">
                {property.rating.toFixed(1)}({property.review_count || 0})
            </span>
            </div>
          )}
        </div>

        {/* Location */}
        {address && (
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
        )}

        {/* Price */}
        <div className="pt-2">
          <p className="text-lg font-bold text-emerald-600">
            {formatPrice(property.asking_price || 0)}
          </p>
        </div>

        {/* Promote Button */}
        <button
          onClick={() => onPromote(property)}
          className="w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Promote Properties
        </button>
      </div>
    </div>
  );
}

// ===========================================
// Search Bar Component
// ===========================================

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
  filterCount: number;
}

function SearchBar({ searchQuery, onSearchChange, onFilterClick, filterCount }: SearchBarProps) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, status..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-reach-primary/20 focus:border-reach-primary"
        />
      </div>
      <button
        onClick={onFilterClick}
        className={`px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 ${
          filterCount > 0
            ? 'bg-reach-primary text-white'
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Filter size={20} />
        {filterCount > 0 && (
          <span className="bg-white text-reach-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );
}

// ===========================================
// Search & Filter Modal Component
// ===========================================

interface SearchFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApply: () => void;
  resultCount: number;
  maxPrice: number;
}

function SearchFilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApply,
  resultCount,
  maxPrice,
}: SearchFilterModalProps) {
  const [locationQuery, setLocationQuery] = useState(filters.location);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(false);
  const [expandedPrice, setExpandedPrice] = useState(false);
  
  // Local UI state for price range (updates immediately)
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(filters.priceRange);
  
  // Debounce timer for price changes
  const priceDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ['Duplex', 'Apartment', 'Bungalow', 'Villa', 'Penthouse', 'Townhouse'];

  // Fixed max price: ₦500M
  const sliderMaxPrice = 500000000;

  // Calculate price step based on max price
  // Use ₦100k steps for prices < ₦10M, ₦500k for < ₦50M, ₦1M for higher
  const calculatePriceStep = useCallback((max: number) => {
    if (max < 10000000) return 100000; // ₦100k
    if (max < 50000000) return 500000; // ₦500k
    return 1000000; // ₦1M
  }, []);

  const priceStep = calculatePriceStep(sliderMaxPrice);

  // Sync local price range only when modal opens or when explicitly reset
  // Don't sync while user is interacting with the slider
  useEffect(() => {
    // Only sync when price section is collapsed (user closed it)
    // This allows user to set exact values without them being reset
    if (!expandedPrice) {
      setLocalPriceRange(filters.priceRange);
    }
  }, [filters.priceRange, expandedPrice]);

  // Debounced location search
  useEffect(() => {
    if (locationQuery.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/locations/search?q=${encodeURIComponent(locationQuery)}`);
          const data = await response.json();
          setLocationSuggestions(data.suggestions || []);
          setShowLocationSuggestions(true);
        } catch (err) {
          console.error('Failed to fetch location suggestions:', err);
          setLocationSuggestions([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  }, [locationQuery]);

  const handleLocationSelect = (location: string) => {
    setLocationQuery(location);
    onFiltersChange({ ...filters, location });
    setShowLocationSuggestions(false);
  };

  const handleClearLocation = () => {
    setLocationQuery('');
    onFiltersChange({ ...filters, location: '' });
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.category.includes(category)
      ? filters.category.filter(c => c !== category)
      : [...filters.category, category];
    onFiltersChange({ ...filters, category: newCategories });
  };

  // Handle price range change with debouncing
  const handlePriceRangeChange = useCallback((newRange: [number, number]) => {
    // Update local state immediately for smooth UI
    setLocalPriceRange(newRange);
    
    // Clear existing timer
    if (priceDebounceTimerRef.current) {
      clearTimeout(priceDebounceTimerRef.current);
    }
    
    // Debounce the actual filter update (300ms delay)
    priceDebounceTimerRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, priceRange: newRange });
    }, 300);
  }, [filters, onFiltersChange]);

  // Handle drag end - apply immediately
  const handlePriceDragEnd = useCallback(() => {
    if (priceDebounceTimerRef.current) {
      clearTimeout(priceDebounceTimerRef.current);
    }
    // Apply immediately when drag ends
    onFiltersChange({ ...filters, priceRange: localPriceRange });
  }, [filters, localPriceRange, onFiltersChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (priceDebounceTimerRef.current) {
        clearTimeout(priceDebounceTimerRef.current);
      }
    };
  }, []);

  const handleClearAll = () => {
    const clearedFilters: FilterState = {
      location: '',
      category: [],
      priceRange: [0, sliderMaxPrice],
    };
    setLocationQuery('');
    setLocalPriceRange([0, sliderMaxPrice]);
    onFiltersChange(clearedFilters);
    setExpandedCategory(false);
    setExpandedPrice(false);
    
    // Clear any pending debounce
    if (priceDebounceTimerRef.current) {
      clearTimeout(priceDebounceTimerRef.current);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40"
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="relative bg-white rounded-t-3xl lg:rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Close filter modal"
            >
              <X size={20} className="text-gray-700" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Search & Filter</h2>
            <div className="w-10" /> {/* Spacer */}
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Location Section */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Location</h3>
              <p className="text-sm text-gray-500 mb-3">Enter a precise location</p>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search locations"
                    value={locationQuery}
                    onChange={(e) => {
                      setLocationQuery(e.target.value);
                      onFiltersChange({ ...filters, location: e.target.value });
                    }}
                    onFocus={() => setShowLocationSuggestions(locationQuery.length > 2)}
                    className="w-full pl-12 pr-12 py-3 bg-white border-2 border-reach-primary rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none"
                    aria-label="Search for location"
                  />
                  {locationQuery && (
                    <button
                    onClick={handleClearLocation}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    aria-label="Clear location"
                  >
                    <X size={16} className="text-gray-600" />
                  </button>
                  )}
                </div>
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20">
                    {locationSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleLocationSelect(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
                      >
                        <span className="text-gray-900">{suggestion}</span>
                        <ChevronUp className="w-4 h-4 text-gray-400 rotate-45" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Category</h3>
                  <p className="text-sm text-gray-500">Choose category type here</p>
                </div>
                <button
                  onClick={() => setExpandedCategory(!expandedCategory)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                >
                  {expandedCategory ? (
                    <X size={20} className="text-gray-700" aria-label="Collapse category filter" />
                  ) : (
                    <span className="text-gray-700 text-xl" aria-label="Expand category filter">+</span>
                  )}
                </button>
              </div>
              {expandedCategory && (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={filters.category.includes(cat)}
                        onChange={() => handleCategoryToggle(cat)}
                        className="w-5 h-5 rounded border-gray-300 text-reach-primary focus:ring-reach-primary"
                      />
                      <span className="text-gray-900">{cat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Price Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Price</h3>
                  <p className="text-sm text-gray-500">What is your budget? get affordable order</p>
                </div>
                {expandedPrice && (
                  <button
                    onClick={() => setExpandedPrice(false)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    aria-label="Collapse price filter"
                  >
                    <X size={20} className="text-gray-700" />
                  </button>
                )}
                {!expandedPrice && (
                  <button
                    onClick={() => setExpandedPrice(true)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    aria-label="Expand price filter"
                  >
                    <span className="text-gray-700 text-xl">+</span>
                  </button>
                )}
              </div>
              {expandedPrice && (
                <div className="space-y-4">
                  <DualRangeSlider
                    min={0}
                    max={sliderMaxPrice}
                    values={localPriceRange}
                    onChange={handlePriceRangeChange}
                    onDragEnd={handlePriceDragEnd}
                    step={priceStep}
                    className="py-2"
                  />
                </div>
              )}
              {!expandedPrice && (
                <input
                  type="text"
                  placeholder="Select price range"
                  readOnly
                  onClick={() => setExpandedPrice(true)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 cursor-pointer"
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              onClick={handleClearAll}
              className="text-gray-700 underline font-medium"
            >
              Clear all
            </button>
            <button
              onClick={() => {
                onApply();
                onClose();
              }}
              className="px-6 py-3 bg-reach-primary text-white rounded-full font-medium hover:bg-reach-primary/90 transition-colors"
            >
              Show {resultCount} results
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ===========================================
// Property Promotion Modal Component
// ===========================================

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
  onGenerateLink: (propertyId: string) => Promise<void>;
  isGenerating: boolean;
  generatedLink: string | null;
}

function PromotionModal({
  isOpen,
  onClose,
  property,
  onGenerateLink,
  isGenerating,
  generatedLink,
}: PromotionModalProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !property) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const address = property.location?.address || 
    `${property.location?.city || ''}, ${property.location?.state || ''}`.trim();

  const handleCopy = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (generatedLink && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out this property: ${property.title}`,
          url: generatedLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40"
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="relative bg-white rounded-t-3xl lg:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Drag Handle */}
          <div className="sticky top-0 bg-white pt-3 pb-2 flex justify-center z-10">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-6 pb-6 space-y-6">
            {/* Property Info */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900 flex-1">{property.title}</h2>
                {property.rating && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                    <span className="text-sm text-gray-600">
                      {property.rating.toFixed(1)}({property.review_count || 0})
                    </span>
                  </div>
                )}
              </div>
              {address && (
                <div className="flex items-center gap-1 text-gray-600 text-sm mb-3">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="line-clamp-1">{address}</span>
          </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-emerald-600">
                  {formatPrice(property.asking_price || 0)}
                </p>
                <div className="bg-gray-100 px-3 py-1 rounded-lg">
                  <span className="text-sm text-gray-700">
                    Commission: <span className="font-bold">{getCreatorCommissionRate(user?.tier)}</span>
                  </span>
                </div>
              </div>
        </div>

            {/* Rule Reminder */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-gray-900 mb-2">Rule Reminder</h3>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Commissions are earned when buyers complete payments through Reach</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Offline deals or direct payments are not tracked</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Commission is released after successful buyer handover</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Only verified properties are eligible for payouts</span>
                </li>
              </ul>
        </div>

            {/* Link Display (if generated) */}
            {generatedLink && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Here&apos;s your tracking link</h3>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    aria-label="Close link display"
                  >
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Send this to your audience and make sure you save it so that you can use it later, too
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900"
                    aria-label="Tracking link"
                  />
                  <button
                    onClick={handleCopy}
                    className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    aria-label={copied ? "Link copied" : "Copy link"}
                  >
                    {copied ? (
                      <span className="text-xs text-emerald-600">Copied!</span>
                    ) : (
                      <Copy size={18} className="text-gray-600" />
                    )}
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function' && (
                    <button
                      onClick={handleShare}
                      className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                      aria-label="Share link"
                    >
                      <Share2 size={18} className="text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
        <div className="flex gap-3">
          <button
                onClick={onClose}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => generatedLink ? onClose() : onGenerateLink(property.id)}
                disabled={isGenerating}
                className="flex-1 py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Generating...
                  </>
                ) : generatedLink ? (
                  'Done'
                ) : (
                  'Generate link'
            )}
          </button>
        </div>
      </div>
        </motion.div>
    </div>
    </AnimatePresence>
  );
}

// ===========================================
// Main Page Component
// ===========================================

export default function CreatorPropertiesPage() {
  const { user } = useUser();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    location: '',
    category: [],
    priceRange: [0, 500000000], // Max price: ₦500M
  });

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await creatorApi.getAvailableProperties();
      const fetchedProperties = (response.properties || []) as Property[];
      setProperties(fetchedProperties);
      
      // Set max price to ₦500M (don't override user's selection)
      // Only update if current max is less than 500M
      setFilters(prev => ({
        ...prev,
        priceRange: [prev.priceRange[0], Math.max(prev.priceRange[1], 500000000)],
      }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(message);
      console.error('Properties fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Filter and search properties
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.location?.city?.toLowerCase().includes(query) ||
        p.location?.state?.toLowerCase().includes(query) ||
        p.location?.address?.toLowerCase().includes(query) ||
        p.status?.toLowerCase().includes(query)
      );
    }

    // Location filter
    if (filters.location) {
      const location = filters.location.toLowerCase();
      filtered = filtered.filter(p =>
        p.location?.city?.toLowerCase().includes(location) ||
        p.location?.state?.toLowerCase().includes(location) ||
        p.location?.address?.toLowerCase().includes(location)
      );
    }

    // Category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter(p =>
        filters.category.includes(p.property_type || '')
      );
    }

    // Price filter
    filtered = filtered.filter(p => {
      const price = p.asking_price || 0;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    return filtered;
  }, [properties, searchQuery, filters]);

  // Get actual max price from properties for filter count
  const actualMaxPrice = useMemo(() => {
    if (properties.length === 0) return 100000000;
    return Math.max(...properties.map(p => p.asking_price || 0), 100000000);
  }, [properties]);

  // Count active filters
  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.location) count++;
    if (filters.category.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < actualMaxPrice) count++;
    return count;
  }, [filters, actualMaxPrice]);

  // Handle promotion
  const handlePromote = (property: Property) => {
    setSelectedProperty(property);
    setGeneratedLink(null);
    setIsPromotionModalOpen(true);
  };

  // Generate link
  const handleGenerateLink = async (propertyId: string) => {
    setIsGeneratingLink(true);
    try {
      const response = await creatorApi.generateTrackingLink(propertyId);
      setGeneratedLink(response.link || (response as any).tracking_link?.tracking_url || '');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to generate link';
      alert(message);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F5] pb-24 lg:pb-6">
      <div className="px-4 py-6 space-y-6">
        {/* Search Bar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setIsFilterModalOpen(true)}
          filterCount={filterCount}
        />

      {/* Loading */}
      {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
                <div className="aspect-[16/9] bg-gray-200" />
              <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load properties</h3>
            <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProperties}
              className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProperties.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || filterCount > 0 ? 'No properties found' : 'No available properties'}
          </h3>
            <p className="text-gray-600">
              {searchQuery || filterCount > 0
                ? 'Try adjusting your search or filters'
              : 'Check back later for new properties to promote'}
          </p>
        </div>
      )}

      {/* Properties Grid */}
      {!isLoading && !error && filteredProperties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
                onPromote={handlePromote}
            />
          ))}
        </div>
      )}

        {/* Search & Filter Modal */}
        <SearchFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
          onApply={() => setIsFilterModalOpen(false)}
          resultCount={filteredProperties.length}
          maxPrice={filters.priceRange[1]}
        />

        {/* Promotion Modal */}
        <PromotionModal
          isOpen={isPromotionModalOpen}
          onClose={() => {
            setIsPromotionModalOpen(false);
            setSelectedProperty(null);
            setGeneratedLink(null);
          }}
          property={selectedProperty}
          onGenerateLink={handleGenerateLink}
          isGenerating={isGeneratingLink}
          generatedLink={generatedLink}
        />
      </div>
    </div>
  );
}
