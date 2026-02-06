'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Plus, ChevronRight } from 'lucide-react';

// ===========================================
// Types
// ===========================================

interface FilterState {
  location: string;
  propertyType: string;
  priceMin: number;
  priceMax: number;
}

interface PropertyType {
  value: string;
  label: string;
}

interface SearchFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters: FilterState;
  onApply: (filters: FilterState) => void;
}

// ===========================================
// Dual Range Slider Component
// ===========================================

function PriceRangeSlider({
  min,
  max,
  values,
  onChange,
}: {
  min: number;
  max: number;
  values: [number, number];
  onChange: (values: [number, number]) => void;
}) {
  const [localValues, setLocalValues] = useState<[number, number]>(values);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), localValues[1] - 50);
    const newValues: [number, number] = [newMin, localValues[1]];
    setLocalValues(newValues);
    onChange(newValues);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), localValues[0] + 50);
    const newValues: [number, number] = [localValues[0], newMax];
    setLocalValues(newValues);
    onChange(newValues);
  };

  const formatValue = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    return value.toString();
  };

  const minPercent = getPercentage(localValues[0]);
  const maxPercent = getPercentage(localValues[1]);

  return (
    <div className="pt-2 pb-4">
      {/* Value display */}
      <div className="flex justify-center mb-4">
        <span className="px-4 py-1.5 bg-reach-primary text-white text-sm rounded-full font-medium">
          {formatValue(localValues[0])} - {formatValue(localValues[1])}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative h-2 mb-2" ref={trackRef}>
        {/* Background track */}
        <div className="absolute inset-0 bg-gray-200 rounded-full" />
        
        {/* Active track */}
        <div
          className="absolute h-full bg-reach-primary rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min thumb */}
        <input
          placeholder="Minimum price"
          type="range"
          min={min}
          max={max}
          value={localValues[0]}
          onChange={handleMinChange}
          className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
          style={{ pointerEvents: 'auto' }}
        />

        {/* Max thumb */}
        <input
          placeholder="Maximum price"
          type="range"
          min={min}
          max={max}
          value={localValues[1]}
          onChange={handleMaxChange}
          className="absolute w-full h-2 opacity-0 cursor-pointer z-20"
          style={{ pointerEvents: 'auto' }}
        />

        {/* Visual thumbs */}
        <div
          className="absolute w-5 h-5 bg-reach-primary rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 border-2 border-white shadow-md"
          style={{ left: `${minPercent}%` }}
        />
        <div
          className="absolute w-5 h-5 bg-reach-primary rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 border-2 border-white shadow-md"
          style={{ left: `${maxPercent}%` }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

// ===========================================
// Accordion Section Component
// ===========================================

function AccordionSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
          <Plus size={20} className="text-gray-400" />
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 animate-slideDown">
          {children}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Main Modal Component
// ===========================================

export function SearchFilterModal({
  isOpen,
  onClose,
  initialFilters,
  onApply,
}: SearchFilterModalProps) {
  const [locationQuery, setLocationQuery] = useState(initialFilters.location);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialFilters.location);
  
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState(initialFilters.propertyType);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isPropertyTypeOpen, setIsPropertyTypeOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialFilters.priceMin || 0,
    initialFilters.priceMax || 1000000000,
  ]);
  const [resultCount, setResultCount] = useState<number | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch property types on mount
  useEffect(() => {
    const fetchPropertyTypes = async () => {
      try {
        const response = await fetch('/api/properties/types', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setPropertyTypes(data.types || []);
        }
      } catch (error) {
        console.error('Error fetching property types:', error);
      }
    };

    if (isOpen) {
      fetchPropertyTypes();
    }
  }, [isOpen]);

  // Fetch location suggestions
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setIsSearchingLocation(false);
    }
  }, []);

  // Debounced location search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(locationQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [locationQuery, searchLocations]);

  // Fetch result count when filters change
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedLocation) params.set('location', selectedLocation);
        if (selectedPropertyType) params.set('property_type', selectedPropertyType);
        if (priceRange[0] > 0) params.set('min_price', priceRange[0].toString());
        if (priceRange[1] < 1000000000) params.set('max_price', priceRange[1].toString());

        const response = await fetch(`/api/properties/count?${params.toString()}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setResultCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching count:', error);
      }
    };

    if (isOpen) {
      fetchCount();
    }
  }, [isOpen, selectedLocation, selectedPropertyType, priceRange]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocationQuery(initialFilters.location);
      setSelectedLocation(initialFilters.location);
      setSelectedPropertyType(initialFilters.propertyType);
      setPriceRange([
        initialFilters.priceMin || 0,
        initialFilters.priceMax || 1000000000,
      ]);
    }
  }, [isOpen, initialFilters]);

  // Handle clear all
  const handleClearAll = () => {
    setLocationQuery('');
    setSelectedLocation('');
    setSelectedPropertyType('');
    setPriceRange([0, 1000000000]);
  };

  // Handle apply
  const handleApply = () => {
    onApply({
      location: selectedLocation,
      propertyType: selectedPropertyType,
      priceMin: priceRange[0],
      priceMax: priceRange[1] === 1000000000 ? 0 : priceRange[1],
    });
  };

  // Handle location select
  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setLocationQuery(location);
    setLocationSuggestions([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 sm:bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-reach-light sm:bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Search & Filter</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-reach-light sm:bg-gray-50">
          {/* Location Section */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Location</h2>
            <p className="text-sm text-gray-500 mb-3">
              {locationSuggestions.length > 0 ? 'Enter a precise location' : 'Put your location, get order faster'}
            </p>
            
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Search locations"
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-10 outline-none focus:ring-2 focus:ring-[#E54D4D]/20 focus:border-[#E54D4D] text-sm sm:text-base"
                  />
                  {locationQuery && (
                    <button
                      onClick={() => {
                        setLocationQuery('');
                        setSelectedLocation('');
                        setLocationSuggestions([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
                      aria-label="Clear"
                    >
                      <X size={16} className="text-gray-400" />
                    </button>
                  )}
                </div>
                {locationSuggestions.length > 0 && (
                  <button
                    onClick={() => setLocationSuggestions([])}
                    className="text-[#E54D4D] font-medium text-sm whitespace-nowrap"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Location Suggestions */}
              {locationSuggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {locationSuggestions.map((location, index) => (
                    <button
                      key={index}
                      onClick={() => handleLocationSelect(location)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg bg-white"
                    >
                      <span className="text-gray-700 text-sm sm:text-base">{location}</span>
                      <ChevronRight size={18} className="text-[#E54D4D] rotate-[-45deg]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Property Type Accordion */}
          <AccordionSection
            title={isPropertyTypeOpen ? 'Category' : 'Property type'}
            subtitle={selectedPropertyType || 'Choose category type here'}
            isOpen={isPropertyTypeOpen}
            onToggle={() => setIsPropertyTypeOpen(!isPropertyTypeOpen)}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setSelectedPropertyType(type.value);
                    setIsPropertyTypeOpen(false);
                  }}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    selectedPropertyType === type.value
                      ? 'bg-reach-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </AccordionSection>

          {/* Price Range Accordion */}
          <AccordionSection
            title="Price"
            subtitle={isPriceOpen ? 'What is your budget? get affordable order' : 'Select price range'}
            isOpen={isPriceOpen}
            onToggle={() => setIsPriceOpen(!isPriceOpen)}
          >
            <PriceRangeSlider
              min={0}
              max={1000000000}
              values={priceRange}
              onChange={setPriceRange}
            />
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleClearAll}
            className="text-gray-600 font-medium underline text-sm sm:text-base"
          >
            Clear all
          </button>
          <button
            onClick={handleApply}
            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-reach-primary text-white font-semibold rounded-full hover:bg-reach-primary/90 transition-colors text-sm sm:text-base"
          >
            Show {resultCount !== null ? `${resultCount} results` : 'results'}
          </button>
        </div>
      </div>
    </div>
  );
}
