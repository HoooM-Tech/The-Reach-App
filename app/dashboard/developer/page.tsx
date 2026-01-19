'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, DeveloperDashboardData, ApiError } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  TrendingUp,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Bell,
  Menu,
  Coins,
  Handshake
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
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">From last 30 days</p>
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
    </motion.div>
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

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4">
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
    
    return () => {
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

  // Get user info
  const firstName = user?.full_name?.split(' ')[0] || 'Developer';
  const companyName = (user as any)?.company_name || (user as any)?.companyName || 'Company';
  const avatarUrl = (user as any)?.avatar_url || (user as any)?.avatarUrl || undefined;
  const isVerified = true; // You can add verification status check here

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

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-6 space-y-6">
        {/* Header is handled by DashboardShell */}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
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
