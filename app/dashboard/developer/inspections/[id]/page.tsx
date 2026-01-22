'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { formatInspectionTimeOnly } from '@/lib/utils/time';
import { 
  ArrowLeft, 
  Calendar, 
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Building2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={12} /> },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;

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

export default function DeveloperInspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const inspectionId = (params?.id as string) || '';
  
  const [inspection, setInspection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch inspection from dashboard API
  const fetchInspection = useCallback(async () => {
    if (!inspectionId || !user?.id) return;

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
      const dashboard = await developerApi.getDashboard(user.id);
      const allInspections = [
        ...(dashboard.inspections?.upcoming || []),
        ...(dashboard.inspections?.recently_booked || []),
      ];
      const foundInspection = allInspections.find((i: any) => i.id === inspectionId);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        if (foundInspection) {
          setInspection(foundInspection);
        } else {
          setError('Inspection not found');
        }
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load inspection';
      setError(message);
      console.error('Inspection fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [inspectionId, user?.id]);

  useEffect(() => {
    if (!inspectionId) {
      router.push('/dashboard/developer/inspections');
      return;
    }

    if (!user) {
      // Wait for user to load
      return;
    }

    fetchInspection();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [inspectionId, user, fetchInspection, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !inspection) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Inspection not found</h3>
            <p className="text-gray-600 mb-4">{error || 'This inspection may have been removed or is no longer available.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/developer/inspections')}
                className="px-6 py-3 bg-[#0A1628] text-white rounded-xl font-medium"
              >
                Back to Inspections
              </button>
              <button
                onClick={fetchInspection}
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

  const inspectionDate = new Date(inspection.slot_time);
  const canCancel = inspection.status === 'pending' || inspection.status === 'confirmed';

  return (
    <div className="p-6 pb-24 lg:pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/developer/inspections')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inspection Details</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={inspection.status} />
              </div>
            </div>
          </div>
          {canCancel && (
            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to cancel this inspection?')) return;
                // TODO: Implement cancel inspection API call
                alert('Cancel functionality will be implemented with API endpoint');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-50 transition-colors"
            >
              <X size={18} />
              Cancel
            </button>
          )}
        </div>

        {/* Property Info */}
        {inspection.properties && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Property</h2>
            <button
              onClick={() => router.push(`/dashboard/developer/properties/${inspection.property_id}`)}
              className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="text-[#0A1628]" size={24} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{inspection.properties.title}</p>
                  {inspection.properties.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin size={14} />
                      <span>
                        {inspection.properties.location.city}, {inspection.properties.location.state}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Inspection Details */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-6">
          <h2 className="font-semibold text-gray-900">Inspection Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Calendar className="text-gray-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled Date</p>
                <p className="font-semibold text-gray-900">
                  {inspectionDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="text-gray-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled Time</p>
                <p className="font-semibold text-gray-900">
                  {formatInspectionTimeOnly(inspection.slot_time)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer Information */}
        {inspection.leads && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Buyer Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0A1628]/10 rounded-full flex items-center justify-center">
                  <User className="text-[#0A1628]" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{inspection.leads.buyer_name}</p>
                </div>
              </div>
              
              {inspection.leads.buyer_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A1628]/10 rounded-full flex items-center justify-center">
                    <Phone className="text-[#0A1628]" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{inspection.leads.buyer_phone}</p>
                  </div>
                </div>
              )}
              
              {inspection.leads.buyer_email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A1628]/10 rounded-full flex items-center justify-center">
                    <Mail className="text-[#0A1628]" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{inspection.leads.buyer_email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {inspection.notes && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{inspection.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
