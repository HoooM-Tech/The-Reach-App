'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { 
  ArrowLeft, 
  Building2,
  MapPin, 
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    new: { label: 'New', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
    contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={12} /> },
    qualified: { label: 'Qualified', color: 'bg-purple-100 text-purple-700', icon: <CheckCircle size={12} /> },
    converted: { label: 'Converted', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
    lost: { label: 'Lost', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.new;

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

export default function DeveloperLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const leadId = (params?.id as string) || '';
  
  const [lead, setLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch lead from dashboard API
  const fetchLead = useCallback(async () => {
    if (!leadId || !user?.id) return;

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
      const foundLead = dashboard.leads?.recent?.find((l: any) => l.id === leadId);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        if (foundLead) {
          setLead(foundLead);
        } else {
          setError('Lead not found');
        }
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load lead';
      setError(message);
      console.error('Lead fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [leadId, user?.id]);

  useEffect(() => {
    if (!leadId) {
      router.push('/dashboard/developer/leads');
      return;
    }

    if (!user) {
      // Wait for user to load
      return;
    }

    fetchLead();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [leadId, user, fetchLead, router]);

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
  if (error || !lead) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lead not found</h3>
            <p className="text-gray-600 mb-4">{error || 'This lead may have been removed or is no longer available.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/developer/leads')}
                className="px-6 py-3 bg-[#0A1628] text-white rounded-xl font-medium"
              >
                Back to Leads
              </button>
              <button
                onClick={fetchLead}
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

  return (
    <div className="p-6 pb-24 lg:pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          { /*
          <button
            aria-label="Go back to leads"
            title="Go back to leads"
            onClick={() => router.push('/dashboard/developer/leads')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Details</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(lead.created_at).toLocaleDateString()} at{' '}
              {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Lead Info Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-6">
          {/* Buyer Info */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Buyer Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0A1628]/10 rounded-full flex items-center justify-center">
                  <User className="text-[#0A1628]" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{lead.buyer_name}</p>
                </div>
              </div>
              
              {lead.buyer_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A1628]/10 rounded-full flex items-center justify-center">
                    <Phone className="text-[#0A1628]" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{lead.buyer_phone}</p>
                  </div>
                </div>
              )}
              
              {lead.buyer_email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A1628]/10 rounded-full flex items-center justify-center">
                    <Mail className="text-[#0A1628]" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{lead.buyer_email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Property Info */}
          {lead.properties && (
            <div className="pt-6 border-t border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Property of Interest</h2>
              <button
                onClick={() => router.push(`/dashboard/developer/properties/${lead.property_id}`)}
                className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="text-[#0A1628]" size={24} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{lead.properties.title}</p>
                    {lead.properties.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <MapPin size={14} />
                        <span>
                          {lead.properties.location.city}, {lead.properties.location.state}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Status */}
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={lead.status || 'new'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
