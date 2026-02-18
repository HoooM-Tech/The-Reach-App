'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  TrendingUp,
  ArrowRight,
  Plus,
  AlertCircle,
  RefreshCw,
  Coins,
  Handshake,
  MapPin,
  Lock,
  ChevronRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Stat Card Component
// ===========================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  color?: 'navy' | 'green' | 'orange' | 'red';
}

function StatCard({ label, value, icon, change, color = 'navy' }: StatCardProps) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
      className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-emerald-600 font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">From last 30 days</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ===========================================
// Handover Alert Card Component
// ===========================================

interface HandoverCardProps {
  handover: {
    id: string;
    propertyId: string;
    property: {
      title: string;
      location: string;
      price?: number;
    };
    status: string;
    propertyPaymentAmount?: number;
    developerPayout?: number;
    buyerName?: string;
  };
  onStart: (handoverId: string, status: string) => void;
}

function HandoverAlertCard({ handover, onStart }: HandoverCardProps) {
  const getActionLabel = () => {
    switch (handover.status) {
      case 'payment_confirmed':
        return 'Upload Documents';
      case 'awaiting_buyer_signature':
        return 'Waiting for buyer';
      case 'documents_signed':
      case 'buyer_signed':
        return 'Schedule Handover';
      case 'scheduled':
        return 'Confirm Handover';
      case 'awaiting_buyer_confirmation':
        return 'Awaiting Confirmation';
      default:
        return 'Start Handover';
    }
  };

  const propertyWithPrice = handover.property as { title: string; location: string; price?: number } | undefined
  const amount = handover.propertyPaymentAmount ?? propertyWithPrice?.price ?? 0
  const payout = handover.developerPayout ?? (amount * 0.85)

  return (
    <div className="bg-white rounded-2xl p-5 border-2 border-orange-400 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Complete Handover</h3>
        <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full" />
          Action Required
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 text-gray-700">
          <Building2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{handover.property?.title ?? 'Property'}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-600">
          <MapPin className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{handover.property?.location ?? '—'}</span>
        </div>
        {amount > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">Payment received</span>
            <span className="font-semibold text-gray-900">₦{Number(amount).toLocaleString()}</span>
          </div>
        )}
        {payout > 0 && (
          <div className="flex items-center gap-3 text-gray-600">
            <Lock className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Your payout (85%): ₦{Number(payout).toLocaleString()} — locked until handover complete</span>
          </div>
        )}
        {handover.buyerName && (
          <p className="text-sm text-gray-500">Buyer: {handover.buyerName}</p>
        )}
      </div>

      <button
        onClick={() => onStart(handover.id, handover.status)}
        className="flex items-center gap-2 text-orange-600 font-medium hover:text-orange-700 transition-colors"
      >
        {getActionLabel()}
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-reach-bg p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Handover Card Skeleton */}
      <div className="h-40 bg-gray-200 rounded-2xl" />

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>

      {/* Booked Inspection Skeleton */}
      <div className="h-20 bg-gray-200 rounded-2xl" />
    </div>
  );
}

// ===========================================
// Error State
// ===========================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-reach-bg p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Dashboard Component
// ===========================================

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Navigate to the correct handover step based on status
  const handleStartHandover = (handoverId: string, status: string) => {
    switch (status) {
      case 'awaiting_buyer_signature':
        router.push(`/dashboard/developer/handover/${handoverId}/wait`);
        break;
      case 'documents_signed':
      case 'buyer_signed':
        router.push(`/dashboard/developer/handover/${handoverId}/schedule`);
        break;
      case 'scheduled':
        router.push(`/dashboard/developer/handover/${handoverId}/confirm`);
        break;
      case 'awaiting_buyer_confirmation':
        router.push(`/dashboard/developer/handover/${handoverId}/progress`);
        break;
      default:
        router.push(`/dashboard/developer/handover/${handoverId}/documents`);
        break;
    }
  };

  // Fetch dashboard data from real API
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const dashboardData = await developerApi.getDashboard(user.id);
      
      if (!abortController.signal.aborted) {
        setData(dashboardData);
      }
    } catch (err) {
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load dashboard data';
      setError(message);
      console.error('Dashboard fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 30000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDashboardData]);

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stats with changes
  const totalListing = data?.properties?.total || 0;
  const totalListingChange = data?.properties?.changes?.total || 0;
  
  const activeListing = data?.properties?.active || data?.properties?.verified || 0;
  const activeListingChange = data?.properties?.changes?.active || 0;
  
  const pendingVerification = data?.properties?.pending || 0;
  const pendingVerificationChange = data?.properties?.changes?.pending || 0;
  
  const totalLeads = data?.leads?.total || 0;
  const totalLeadsChange = data?.leads?.change || 0;

  // Booked inspections count
  const bookedInspectionsCount = data?.inspections?.total_booked || 0;

  // Pending handovers
  const pendingHandovers = data?.handovers || [];

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-6 space-y-6">
        {/* Handover Alert Cards */}
        {pendingHandovers.length > 0 && (
          <div className="space-y-4">
            {pendingHandovers.map((handover: any) => (
              <motion.div
                key={handover.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              >
                <HandoverAlertCard
                  handover={handover}
                  onStart={handleStartHandover}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Listing"
            value={totalListing}
            icon={<Building2 size={20} className="text-gray-600" />}
            change={totalListingChange}
            color="navy"
          />
          <StatCard
            label="Active Listing"
            value={activeListing}
            icon={<Coins size={20} className="text-gray-600" />}
            change={activeListingChange}
            color="navy"
          />
          <StatCard
            label="Pending Verification"
            value={pendingVerification}
            icon={<Handshake size={20} className="text-gray-600" />}
            change={pendingVerificationChange}
            color="navy"
          />
          <StatCard
            label="Total Leads"
            value={totalLeads}
            icon={<Users size={20} className="text-gray-600" />}
            change={totalLeadsChange}
            color="navy"
          />
        </div>

        {/* Booked Inspection Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.1 }}
          onClick={() => router.push('/dashboard/developer/inspections')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">Booked Inspection</h2>
            {bookedInspectionsCount > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {bookedInspectionsCount}
              </span>
            )}
          </div>
          <ArrowRight size={20} className="text-orange-500" />
        </motion.div>

        {/* Quick Actions - Desktop Only */}
        <div className="hidden lg:block bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard/developer/properties/new')}
              className="flex items-center gap-2 px-4 py-2.5 bg-reach-primary text-white rounded-xl hover:bg-reach-primary/90 transition-colors"
            >
              <Plus size={18} />
              Add New Property
            </button>
            <button
              onClick={() => router.push('/dashboard/developer/properties')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Building2 size={18} />
              View All Properties
            </button>
            <button
              onClick={() => router.push('/dashboard/developer/leads')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Users size={18} />
              View Leads
            </button>
          </div>
        </div>

        {/* Floating Action Button (Mobile) */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          onClick={() => router.push('/dashboard/developer/properties/new')}
          className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-reach-primary text-white rounded-full shadow-xl flex items-center justify-center z-30"
          aria-label="Add Property"
          title="Add Property"
        >
          <Plus size={24} />
        </motion.button>
      </div>
    </div>
  );
}
