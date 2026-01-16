'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { 
  ArrowLeft, 
  Edit, 
  Building2,
  MapPin, 
  Bed, 
  Bath,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  Eye,
  Users
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    verified: { 
      label: 'Verified', 
      color: 'bg-emerald-100 text-emerald-700', 
      icon: <CheckCircle size={12} /> 
    },
    pending_verification: { 
      label: 'Pending', 
      color: 'bg-orange-100 text-orange-700', 
      icon: <Clock size={12} /> 
    },
    submitted: { 
      label: 'Submitted', 
      color: 'bg-blue-100 text-blue-700', 
      icon: <Clock size={12} /> 
    },
    draft: { 
      label: 'Draft', 
      color: 'bg-gray-100 text-gray-700', 
      icon: <FileEdit size={12} /> 
    },
    rejected: { 
      label: 'Rejected', 
      color: 'bg-red-100 text-red-700', 
      icon: <XCircle size={12} /> 
    },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperPropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const propertyId = (params?.id as string) || '';
  
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ views: 0, leads: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch property from real API
  const fetchProperty = useCallback(async () => {
    if (!propertyId || !user?.id) return;

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
      const property = await developerApi.getProperty(propertyId);
      
      // Fetch stats (views and leads) for this property
      let viewsCount = 0;
      let leadsCount = 0;
      
      try {
        const statsResponse = await fetch(`/api/properties/${propertyId}/stats`, {
          signal: abortController.signal,
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          viewsCount = statsData.views || 0;
          leadsCount = statsData.leads || 0;
        } else {
          const errorData = await statsResponse.json().catch(() => ({}));
          console.warn('Failed to fetch property stats:', errorData);
        }
      } catch (statsError: any) {
        // Don't fail the whole request if stats fail
        if (!statsError.name || statsError.name !== 'AbortError') {
          console.warn('Error fetching property stats:', statsError);
        }
      }
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setProperty(property);
        setStats({ views: viewsCount, leads: leadsCount });
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load property';
      setError(message);
      console.error('Property fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [propertyId, user?.id]);

  useEffect(() => {
    if (!propertyId) {
      router.push('/dashboard/developer/properties');
      return;
    }

    if (!user) {
      // Wait for user to load
      return;
    }

    fetchProperty();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [propertyId, user, fetchProperty, router]);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Property not found</h3>
            <p className="text-gray-600 mb-4">{error || 'This property may have been removed or is no longer available.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/developer/properties')}
                className="px-6 py-3 bg-[#0A1628] text-white rounded-xl font-medium"
              >
                Back to Properties
              </button>
              <button
                onClick={fetchProperty}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canEdit = property.verification_status === 'draft' || property.verification_status === 'rejected';
  const canSubmit = property.verification_status === 'draft';

  return (
    <div className="p-6 pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/developer/properties')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={property.verification_status || property.status} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => router.push(`/dashboard/developer/properties/${property.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                <Edit size={18} />
                Edit
              </button>
            )}
            {canSubmit && (
              <button
                onClick={async () => {
                  try {
                    await developerApi.submitForVerification(property.id);
                    await fetchProperty();
                    alert('Property submitted for verification successfully!');
                  } catch (err: any) {
                    alert(err.message || 'Failed to submit property');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-xl font-medium hover:bg-[#0A1628]/90 transition-colors"
              >
                Submit for Verification
              </button>
            )}
          </div>
        </div>

        {/* Gallery */}
        {property.media && property.media.length > 0 && (
          <div className="relative aspect-[16/9] bg-gray-100 rounded-2xl overflow-hidden">
            <img
              src={property.media[0].url}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Property Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-6">
          {/* Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-[#0A1628]">
                {formatPrice(property.asking_price || 0)}
              </p>
              {property.minimum_price && property.minimum_price !== property.asking_price && (
                <p className="text-sm text-gray-500 mt-1">
                  Minimum: {formatPrice(property.minimum_price)}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {property.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={18} />
              <span>
                {property.location.address && `${property.location.address}, `}
                {property.location.city}, {property.location.state}
              </span>
            </div>
          )}

          {/* Features */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
            {property.bedrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bed size={20} className="text-gray-400" />
                <span className="font-medium text-gray-700">{property.bedrooms} Bedrooms</span>
              </div>
            )}
            {property.bathrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bath size={20} className="text-gray-400" />
                <span className="font-medium text-gray-700">{property.bathrooms} Bathrooms</span>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>
          )}

          {/* Performance Stats */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Performance Stats</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  <span className="font-semibold text-gray-900">{stats.views}</span> Views
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  <span className="font-semibold text-gray-900">{stats.leads}</span> Leads
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
