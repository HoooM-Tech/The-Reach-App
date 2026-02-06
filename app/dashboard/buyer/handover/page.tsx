'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { 
  FileText, 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';

// ===========================================
// Types
// ===========================================

interface Handover {
  id: string;
  property_id: string;
  buyer_id: string;
  developer_id: string;
  status: 'pending' | 'in_progress' | 'documents_submitted' | 'documents_verified' | 'payment_confirmed' | 'keys_released' | 'completed';
  created_at: string;
  updated_at: string;
  properties?: {
    id: string;
    title: string;
    asking_price: number;
    location?: {
      city?: string;
      state?: string;
    };
    media?: Array<{ url: string }>;
  };
}

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { 
      label: 'Pending', 
      color: 'bg-orange-100 text-orange-700', 
      icon: <Clock size={14} /> 
    },
    in_progress: { 
      label: 'In Progress', 
      color: 'bg-blue-100 text-blue-700', 
      icon: <Clock size={14} /> 
    },
    documents_submitted: { 
      label: 'Documents Submitted', 
      color: 'bg-purple-100 text-purple-700', 
      icon: <FileText size={14} /> 
    },
    documents_verified: { 
      label: 'Documents Verified', 
      color: 'bg-green-100 text-green-700', 
      icon: <CheckCircle size={14} /> 
    },
    payment_confirmed: { 
      label: 'Payment Confirmed', 
      color: 'bg-green-100 text-green-700', 
      icon: <CheckCircle size={14} /> 
    },
    keys_released: { 
      label: 'Keys Released', 
      color: 'bg-green-100 text-green-700', 
      icon: <CheckCircle size={14} /> 
    },
    completed: { 
      label: 'Completed', 
      color: 'bg-emerald-100 text-emerald-700', 
      icon: <CheckCircle size={14} /> 
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ===========================================
// Handover Card Component
// ===========================================

function HandoverCard({ 
  handover, 
  onClick 
}: { 
  handover: Handover;
  onClick: () => void;
}) {
  const property = handover.properties;
  const locationText = property?.location 
    ? [property.location.city, property.location.state].filter(Boolean).join(', ')
    : 'Location not available';

  const formatPrice = (price?: number) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
    >
      <div className="flex gap-4">
        {/* Property Image */}
        <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
          {property?.media?.[0]?.url ? (
            <img
              src={property.media[0].url}
              alt={property.title || 'Property'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 size={24} className="text-gray-300" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {property?.title || 'Property Handover'}
            </h3>
            <ArrowRight size={18} className="text-gray-400 flex-shrink-0" />
          </div>
          
          <p className="text-sm text-gray-500 mb-2">{locationText}</p>
          
          <div className="flex items-center justify-between">
            <StatusBadge status={handover.status} />
            <span className="text-xs text-gray-400">
              {formatDate(handover.created_at)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function HandoverSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-6 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Handover Page
// ===========================================

export default function BuyerHandoverPage() {
  const router = useRouter();
  const { user } = useUser();
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHandovers = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dashboard/buyer/${user.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch handovers');
      }
      
      const data = await response.json();
      const allHandovers = [
        ...(data.handovers?.pending || []),
        ...(data.handovers?.completed || []),
      ];
      setHandovers(allHandovers);
    } catch (err) {
      console.error('Error fetching handovers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load handovers');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHandovers();
  }, [fetchHandovers]);

  const pendingHandovers = handovers.filter(h => 
    ['pending', 'in_progress', 'documents_submitted', 'documents_verified', 'payment_confirmed', 'keys_released'].includes(h.status)
  );
  const completedHandovers = handovers.filter(h => h.status === 'completed');

  return (
    <div className="min-h-screen bg-reach-light p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Handovers</h1>
          <p className="text-gray-500 text-sm mt-1">Track your property handover progress</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <HandoverSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load handovers</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchHandovers}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg hover:bg-[#d43d3d]"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        ) : handovers.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No handovers yet</h3>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">
              Your property handovers will appear here once a purchase is completed
            </p>
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="px-4 py-2 bg-[#E54D4D] text-white rounded-lg hover:bg-[#d43d3d]"
            >
              Browse Properties
            </button>
          </div>
        ) : (
          <>
            {/* Pending/Active Handovers */}
            {pendingHandovers.length > 0 && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Active ({pendingHandovers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingHandovers.map((handover) => (
                    <HandoverCard
                      key={handover.id}
                      handover={handover}
                      onClick={() => router.push(`/dashboard/buyer/handover/${handover.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Handovers */}
            {completedHandovers.length > 0 && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                  Completed ({completedHandovers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {completedHandovers.map((handover) => (
                    <HandoverCard
                      key={handover.id}
                      handover={handover}
                      onClick={() => router.push(`/dashboard/buyer/handover/${handover.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
