'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, DeveloperDashboardData, ApiError } from '@/lib/api/client';
import { 
  Building2, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// ===========================================
// Stats Card Component
// ===========================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: 'navy' | 'green' | 'orange' | 'red';
}

function StatCard({ label, value, icon, trend, color = 'navy' }: StatCardProps) {
  const colorClasses = {
    navy: 'bg-[#0A1628] text-white',
    green: 'bg-emerald-500 text-white',
    orange: 'bg-orange-500 text-white',
    red: 'bg-red-500 text-white',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-2xl" />
    </div>
  );
}

// ===========================================
// Error State
// ===========================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load dashboard</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-lg hover:bg-[#0A1628]/90"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    </div>
  );
}

// ===========================================
// Empty State
// ===========================================

function EmptyState({ title, description, actionLabel, onAction }: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
      <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-lg hover:bg-[#0A1628]/90"
      >
        <Plus size={16} />
        {actionLabel}
      </button>
    </div>
  );
}

// ===========================================
// Main Dashboard Component
// ===========================================

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [data, setData] = useState<DeveloperDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch dashboard data from real API
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    
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
      const dashboardData = await developerApi.getDashboard(user.id);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setData(dashboardData);
      }
    } catch (err) {
      // Don't set error if request was aborted
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
    
    // Cleanup: abort request if component unmounts
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Developer'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/developer/properties/new')}
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-xl hover:bg-[#0A1628]/90 transition-colors"
        >
          <Plus size={18} />
          Add Property
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Properties"
          value={data?.properties.total || 0}
          icon={<Building2 size={20} />}
          color="navy"
        />
        <StatCard
          label="Verified"
          value={data?.properties.verified || 0}
          icon={<CheckCircle size={20} />}
          color="green"
        />
        <StatCard
          label="Total Leads"
          value={data?.leads.total || 0}
          icon={<Users size={20} />}
          color="orange"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data?.payments.total_revenue || 0)}
          icon={<DollarSign size={20} />}
          color="navy"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/dashboard/developer/properties/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0A1628] text-white rounded-xl hover:bg-[#0A1628]/90 transition-colors"
          >
            <Plus size={18} />
            Add New Property
          </button>
          <button
            onClick={() => router.push('/dashboard/developer/properties')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Building2 size={18} />
            View All Properties
          </button>
          <button
            onClick={() => router.push('/dashboard/developer/leads')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Users size={18} />
            View Leads
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <button
              onClick={() => router.push('/dashboard/developer/leads')}
              className="text-sm text-[#E54D4D] font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          
          {(!data?.leads.recent || data.leads.recent.length === 0) ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No leads yet</p>
              <p className="text-sm">Leads will appear here when buyers show interest</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.leads.recent.slice(0, 5).map((lead: any) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-gray-900">{lead.buyer_name}</p>
                    <p className="text-sm text-gray-500">{lead.buyer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{lead.properties?.title || 'Property'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Inspections */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Inspections</h2>
            <button
              onClick={() => router.push('/dashboard/developer/inspections')}
              className="text-sm text-[#E54D4D] font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          
          {(!data?.inspections.upcoming || data.inspections.upcoming.length === 0) ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No upcoming inspections</p>
              <p className="text-sm">Scheduled inspections will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.inspections.upcoming.slice(0, 5).map((inspection: any) => (
                <div
                  key={inspection.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0A1628]/10 rounded-lg flex items-center justify-center">
                      <Clock size={18} className="text-[#0A1628]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {inspection.properties?.title || 'Property Inspection'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {inspection.leads?.buyer_name || 'Buyer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(inspection.slot_time).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(inspection.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(data?.payments.total_revenue || 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">In Escrow</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(data?.payments.pending_escrow || 0)}
            </p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">Paid Out</p>
            <p className="text-xl font-bold text-emerald-600">
              {formatCurrency(data?.payments.paid_out || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile) */}
      <button
        onClick={() => router.push('/dashboard/developer/properties/new')}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-[#0A1628] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
