'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { buyerApi, BuyerDashboardData, ApiError } from '@/lib/api/client';
import { 
  Calendar, 
  Clock,
  Building2,
  RefreshCw,
  AlertCircle,
  User,
  Phone,
  CheckCircle,
  XCircle,
  MapPin
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Inspection Card Component
// ===========================================

interface InspectionCardProps {
  inspection: any;
  onClick: () => void;
}

function InspectionCard({ inspection, onClick }: InspectionCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'Pending', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={12} /> },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    };
    return statusConfig[status?.toLowerCase()] || statusConfig.pending;
  };

  const statusInfo = getStatusBadge(inspection.status);
  const inspectionDate = new Date(inspection.slot_time);
  const isPast = inspectionDate < new Date();

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all text-left"
    >
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
          isPast ? 'bg-gray-100' : 'bg-[#E54D4D]'
        }`}>
          <span className={`text-xs font-medium ${isPast ? 'text-gray-500' : 'text-white/70'}`}>
            {inspectionDate.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className={`text-lg font-bold ${isPast ? 'text-gray-700' : 'text-white'}`}>
            {inspectionDate.getDate()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {inspection.properties?.title || 'Property Inspection'}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <Clock size={14} />
                <span>
                  {inspectionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {inspection.properties?.location && (
                  <>
                    <span className="mx-1">•</span>
                    <MapPin size={14} />
                    <span className="line-clamp-1">
                      {inspection.properties.location.city}, {inspection.properties.location.state}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function BuyerInspectionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [inspections, setInspections] = useState<{
    upcoming: any[];
    past: any[];
  }>({ upcoming: [], past: [] });
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch inspections from dashboard API
  const fetchInspections = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const dashboard = await buyerApi.getDashboard(user.id);
      setInspections({
        upcoming: dashboard.inspections?.upcoming || [],
        past: dashboard.inspections?.past || [],
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load inspections';
      setError(message);
      console.error('Inspections fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [user?.id]);

  const displayedInspections = activeTab === 'upcoming' 
    ? inspections.upcoming 
    : inspections.past;

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Inspections</h1>
        <p className="text-gray-500 text-sm mt-1">
          {inspections.upcoming.length} upcoming, {inspections.past.length} past
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-[#E54D4D] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Upcoming ({inspections.upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'past'
              ? 'bg-[#E54D4D] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Past ({inspections.past.length})
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load inspections</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchInspections}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && displayedInspections.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No {activeTab === 'upcoming' ? 'upcoming' : 'past'} inspections
          </h3>
          <p className="text-gray-500 mb-6">
            {activeTab === 'upcoming'
              ? 'Book an inspection to see it here'
              : 'Your past inspections will appear here'}
          </p>
          {activeTab === 'upcoming' && (
            <button
              onClick={() => router.push('/properties')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E54D4D] text-white rounded-xl font-medium"
            >
              Browse Properties
            </button>
          )}
        </div>
      )}

      {/* Inspections List */}
      {!isLoading && !error && displayedInspections.length > 0 && (
        <div className="space-y-4">
          {displayedInspections.map((inspection: any) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              onClick={() => router.push(`/property/${inspection.property_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

