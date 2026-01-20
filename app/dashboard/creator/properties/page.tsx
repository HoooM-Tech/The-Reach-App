'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, ApiError } from '@/lib/api/client';
import { 
  Building2, 
  MapPin, 
  Link2,
  RefreshCw,
  AlertCircle,
  Search,
  CheckCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

// ===========================================
// Property Card for Creator
// ===========================================

interface PropertyCardProps {
  property: any;
  onGenerateLink: (propertyId: string) => void;
  isGenerating: boolean;
}

function PropertyCard({ property, onGenerateLink, isGenerating }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const primaryImage = property.media?.[0]?.url;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Image */}
      <div className="relative aspect-[16/9] bg-gray-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-gray-300" />
          </div>
        )}
        {property.visibility === 'exclusive_creators' && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-reach-primary text-white text-xs rounded-full font-medium">
            Exclusive
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h3>

        {property.location && (
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin size={14} />
            <span className="line-clamp-1">
              {property.location.city}, {property.location.state}
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200">
          <p className="text-lg font-bold text-gray-900">
            {formatPrice(property.asking_price || 0)}
          </p>
        </div>

        {/* Commission Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Estimated Commission</p>
          <p className="text-sm font-semibold text-emerald-600">
            {formatPrice((property.asking_price || 0) * 0.02)} (2%)
          </p>
        </div>

        {/* Generate Link Button */}
        <button
          onClick={() => onGenerateLink(property.id)}
          disabled={isGenerating}
          className="w-full py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Generating...
            </>
          ) : (
            <>
              <Link2 size={16} />
              Generate Tracking Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ===========================================
// Success Modal
// ===========================================

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingLink: any;
}

function SuccessModal({ isOpen, onClose, trackingLink }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !trackingLink) return null;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(trackingLink.tracking_url || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-md p-6 border border-gray-200 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-reach-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Link Generated!</h3>
          <p className="text-gray-600 mb-6">
            Your unique tracking link has been created. Share it to start earning!
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 mb-2">Your Tracking Link</p>
          <p className="text-sm text-gray-900 break-all font-mono">
            {trackingLink.tracking_url}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyToClipboard}
            className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle size={16} />
                Copied!
              </>
            ) : (
              'Copy Link'
            )}
          </button>
          <a
            href={trackingLink.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink size={16} />
            Preview
          </a>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function CreatorPropertiesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingPropertyId, setGeneratingPropertyId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; link: any }>({
    isOpen: false,
    link: null,
  });

  // Fetch available properties
  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await creatorApi.getAvailableProperties();
      setProperties(response.properties || []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(message);
      console.error('Properties fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Generate tracking link
  const handleGenerateLink = async (propertyId: string) => {
    setGeneratingPropertyId(propertyId);

    try {
      const response = await creatorApi.generateTrackingLink(propertyId);
      setSuccessModal({
        isOpen: true,
        link: response.link,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to generate link';
      alert(message);
    } finally {
      setGeneratingPropertyId(null);
    }
  };

  // Filter properties by search
  const filteredProperties = properties.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Properties</h1>
          <p className="text-gray-500 text-sm mt-1">
            Browse verified properties and generate tracking links to earn commissions
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-reach-primary/20 focus:border-reach-primary"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              {searchQuery ? 'No properties found' : 'No available properties'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Try adjusting your search' 
                : 'Check back later for new properties to promote'}
            </p>
          </div>
        )}

        {/* Properties Grid */}
        {!isLoading && !error && filteredProperties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                onGenerateLink={handleGenerateLink}
                isGenerating={generatingPropertyId === property.id}
              />
            ))}
          </div>
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, link: null })}
          trackingLink={successModal.link}
        />
      </div>
    </div>
  );
}


