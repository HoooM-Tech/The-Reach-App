'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { PropertyGallery } from '@/components/properties/PropertyGallery';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Property, PropertyStatus } from '@/types/property';
import type { Property as ApiProperty } from '@/types';
import { formatPrice } from '@/lib/formatters';
import { ArrowLeft, CheckCircle, XCircle, MapPin, Bed, Bath, FileText, Eye, Users, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminReviewPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();
  const propertyId = (params?.id as string) || '';
  const [property, setProperty] = useState<ApiProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadProperty = useCallback(async () => {
    if (!propertyId) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);
      const prop = await developerApi.getProperty(propertyId);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        if (!prop) {
          setError('Property not found');
          return;
        }

      // Only show properties in queue
      const status = prop.verification_status || prop.status;
      if (status !== 'submitted' && status !== 'pending_verification') {
        router.push('/admin/properties');
        return;
      }

      setProperty(prop as ApiProperty);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load property';
      setError(message);
      console.error('Failed to load property:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [propertyId, router]);

  useEffect(() => {
    if (!propertyId) {
      router.push('/admin/properties');
      return;
    }

    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Role check is handled by layout/middleware
    loadProperty();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [propertyId, user, userLoading, loadProperty, router]);

  const handleApprove = async () => {
    if (!property) return;

    try {
      setIsProcessing(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/properties/${property.id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve property');
      }

      router.push('/admin/properties');
    } catch (error: any) {
      alert(error.message || 'Failed to approve property');
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!property || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/properties/${property.id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ action: 'reject', reason: rejectionReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject property');
      }

      router.push('/admin/properties');
    } catch (error: any) {
      alert(error.message || 'Failed to reject property');
      setIsProcessing(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <div className="h-96 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load property</h3>
            <p className="text-gray-600 mb-4">{error || 'Property not found'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/admin/properties')}
                className="px-6 py-3 bg-reach-navy text-white rounded-lg"
              >
                Back to Queue
              </button>
              <button
                onClick={loadProperty}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2"
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

  return (
    <div className="min-h-screen bg-reach-light p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Property</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={property.verification_status as any} />
              </div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {property.media && property.media.length > 0 && (
          <PropertyGallery media={property.media.map((m: any) => ({
            id: m.id,
            url: m.url,
            type: (m.type === 'image' || m.type === 'IMAGE') ? 'IMAGE' : 'VIDEO',
            sortOrder: m.sort_order || m.sortOrder || 0,
          }))} />
        )}

        {/* Property Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-6">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900">{property.title}</h2>

          {/* Location */}
          {property.location?.address && (
            <div className="flex items-center gap-2 text-reach-red">
              <MapPin size={18} />
              <span className="text-sm font-medium">{property.location.address}</span>
            </div>
          )}

          {/* Price */}
          <div className="pt-4 border-t border-gray-100">
            <span className="text-2xl font-bold text-green-600">
              {formatPrice(property.asking_price, (property as any).currency || 'NGN')}
            </span>
          </div>

          {/* Property Features */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
            {(property as any).bedrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bed size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{(property as any).bedrooms} Beds</span>
              </div>
            )}
            {(property as any).bathrooms !== undefined && (
              <div className="flex items-center gap-2">
                <Bath size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{(property as any).bathrooms} Bathroom</span>
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Documents */}
          {(property as any).documents && (property as any).documents.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Documents</h3>
              <div className="space-y-2">
                {((property as any).documents as Array<{ id: string; name: string; doc_type?: string; docType?: string }>).map((doc: { id: string; name: string; doc_type?: string; docType?: string }) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{doc.name}</span>
                    <span className="ml-auto text-xs text-gray-500 capitalize">{(doc.docType || doc.doc_type || '').replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          {!showRejectDialog ? (
            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={20} />
                Approve Property
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircle size={20} />
                Reject Property
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="Explain why this property is being rejected..."
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle size={20} />
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

