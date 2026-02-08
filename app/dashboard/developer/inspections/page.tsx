'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, DeveloperDashboardData, ApiError } from '@/lib/api/client';
import { isBefore, formatInspectionTimeOnly, parseTimestamp } from '@/lib/utils/time';
import { 
  Calendar, 
  Clock,
  Building2,
  RefreshCw,
  AlertCircle,
  User,
  Phone,
  CheckCircle,
  XCircle
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
      booked: { label: 'Booked', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
      pending: { label: 'Pending', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={12} /> },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
      withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700', icon: <XCircle size={12} /> },
    };
    return statusConfig[status?.toLowerCase()] || statusConfig.booked;
  };

  const statusInfo = getStatusBadge(inspection.status);
  const inspectionDate = parseTimestamp(inspection.slot_time);
  const isPast = isBefore(inspection.slot_time, new Date().toISOString());

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 hover:shadow-lg transition-all text-left"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
          isPast ? 'bg-gray-100' : 'bg-[#15355A]'
        }`}>
          <span className={`text-[10px] sm:text-xs font-medium ${isPast ? 'text-gray-500' : 'text-white/70'}`}>
            {inspectionDate.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className={`text-base sm:text-lg font-bold ${isPast ? 'text-gray-700' : 'text-white'}`}>
            {inspectionDate.getDate()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {inspection.properties?.title || 'Property Inspection'}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-gray-500">
                <Clock size={14} className="flex-shrink-0" />
                <span>
                  {formatInspectionTimeOnly(inspection.slot_time)}
                </span>
              </div>
            </div>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap flex-shrink-0 ${statusInfo.color}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </div>

          {inspection.leads && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
              <span className="flex items-center gap-1 min-w-0">
                <User size={14} className="flex-shrink-0" />
                <span className="truncate">{inspection.leads.buyer_name}</span>
              </span>
              <span className="flex items-center gap-1 min-w-0">
                <Phone size={14} className="flex-shrink-0" />
                <span className="truncate">{inspection.leads.buyer_phone}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperInspectionsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [inspections, setInspections] = useState<{
    upcoming: any[];
    recently_booked: any[];
    completed: number;
  }>({ upcoming: [], recently_booked: [], completed: 0 });
  const [activeTab, setActiveTab] = useState<'upcoming' | 'recent'>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch inspections from dashboard API
  const fetchInspections = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const dashboard = await developerApi.getDashboard(user.id);
      setInspections({
        upcoming: dashboard.inspections?.upcoming || [],
        recently_booked: dashboard.inspections?.recently_booked || [],
        completed: dashboard.inspections?.completed || 0,
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
    : inspections.recently_booked;

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header title is handled by DashboardShell */}
        <div>
          <p className="text-gray-500 text-sm">
            {inspections.upcoming.length} upcoming, {inspections.completed} completed
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-[#15355A] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Upcoming ({inspections.upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'recent'
                ? 'bg-[#15355A] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Recently Booked ({inspections.recently_booked.length})
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 animate-pulse">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 max-w-[200px] mb-2" />
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2 max-w-[100px]" />
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#15355A] text-white rounded-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && displayedInspections.length === 0 && (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-100">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
            No {activeTab === 'upcoming' ? 'upcoming' : 'recent'} inspections
          </h3>
          <p className="text-sm sm:text-base text-gray-500">
            {activeTab === 'upcoming'
              ? 'Scheduled inspections will appear here'
              : 'Recently booked inspections will appear here'}
          </p>
        </div>
      )}

      {/* Inspections List */}
      {!isLoading && !error && displayedInspections.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {displayedInspections.map((inspection: any) => (
            <InspectionCard
              key={inspection.id}
              inspection={inspection}
              onClick={() => router.push(`/dashboard/developer/inspections/${inspection.id}`)}
            />
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
