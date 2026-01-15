'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { buyerApi, BuyerDashboardData, ApiError } from '@/lib/api/client';
import { 
  Building2, 
  Calendar, 
  Clock, 
  FileText,
  Eye,
  Heart,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Search,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react';

// ===========================================
// Stat Card Component
// ===========================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'red' | 'green' | 'orange' | 'blue';
}

function StatCard({ label, value, icon, color = 'red' }: StatCardProps) {
  const colorClasses = {
    red: 'bg-[#E54D4D] text-white',
    green: 'bg-emerald-500 text-white',
    orange: 'bg-orange-500 text-white',
    blue: 'bg-blue-500 text-white',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg hover:bg-[#E54D4D]/90"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    </div>
  );
}

// ===========================================
// Property Card Component
// ===========================================

interface PropertyCardProps {
  property: any;
  onClick: () => void;
}

function PropertyCard({ property, onClick }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl text-left hover:bg-gray-100 transition-colors"
    >
      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
        <Building2 className="text-gray-400" size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{property.title}</p>
        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
          <MapPin size={14} />
          <span className="truncate">{property.location?.city || 'Location unavailable'}</span>
        </div>
        <p className="text-sm font-semibold text-[#E54D4D] mt-1">
          {formatPrice(property.asking_price || 0)}
        </p>
      </div>
    </button>
  );
}

// ===========================================
// Main Dashboard Component
// ===========================================

export default function BuyerDashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [data, setData] = useState<BuyerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data from real API
  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const dashboardData = await buyerApi.getDashboard(user.id);
      setData(dashboardData);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load dashboard data';
      setError(message);
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  // Get inspection status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      'pending': { label: 'Pending', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
      'confirmed': { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={12} /> },
      'completed': { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
      'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    };
    return statusMap[status] || statusMap['pending'];
  };

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  const upcomingInspections = data?.inspections.upcoming || [];
  const viewedProperties = data?.viewed_properties || [];

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'}
          </p>
        </div>
        <button
          onClick={() => router.push('/properties')}
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-xl hover:bg-[#E54D4D]/90 transition-colors"
        >
          <Search size={18} />
          Find Properties
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Properties Viewed"
          value={viewedProperties.length}
          icon={<Eye size={20} />}
          color="red"
        />
        <StatCard
          label="Upcoming Inspections"
          value={upcomingInspections.length}
          icon={<Calendar size={20} />}
          color="blue"
        />
        <StatCard
          label="Active Transactions"
          value={data?.payments.active_transactions.length || 0}
          icon={<FileText size={20} />}
          color="orange"
        />
        <StatCard
          label="Pending Handovers"
          value={data?.handovers.pending.length || 0}
          icon={<Building2 size={20} />}
          color="green"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/properties')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E54D4D] text-white rounded-xl hover:bg-[#E54D4D]/90 transition-colors"
          >
            <Search size={18} />
            Browse Properties
          </button>
          <button
            onClick={() => router.push('/dashboard/buyer/inspections')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Calendar size={18} />
            View Inspections
          </button>
          <button
            onClick={() => router.push('/dashboard/buyer/saved')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Heart size={18} />
            Saved Properties
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Inspections */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Inspections</h2>
            <button
              onClick={() => router.push('/dashboard/buyer/inspections')}
              className="text-sm text-[#E54D4D] font-medium hover:underline flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          
          {upcomingInspections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No upcoming inspections</p>
              <p className="text-sm">Browse properties and book an inspection</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingInspections.slice(0, 3).map((inspection: any) => {
                const statusInfo = getStatusBadge(inspection.status);
                return (
                  <div
                    key={inspection.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#E54D4D]/10 rounded-lg flex items-center justify-center">
                        <Calendar size={20} className="text-[#E54D4D]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {inspection.properties?.title || 'Property Inspection'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(inspection.slot_time).toLocaleDateString()} at{' '}
                          {new Date(inspection.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recently Viewed Properties */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recently Viewed</h2>
            <button
              onClick={() => router.push('/properties')}
              className="text-sm text-[#E54D4D] font-medium hover:underline flex items-center gap-1"
            >
              Browse More <ArrowRight size={14} />
            </button>
          </div>
          
          {viewedProperties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No properties viewed yet</p>
              <p className="text-sm">Start browsing to see your history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {viewedProperties.slice(0, 3).map((property: any) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => router.push(`/property/${property.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Handovers */}
      {data?.handovers.pending && data.handovers.pending.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pending Handovers</h2>
          </div>
          <div className="space-y-3">
            {data.handovers.pending.map((handover: any) => (
              <div
                key={handover.id}
                className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {handover.properties?.title || 'Property Handover'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Status: {handover.status}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/buyer/handover/${handover.id}`)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile) */}
      <button
        onClick={() => router.push('/properties')}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-[#E54D4D] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform z-30"
      >
        <Search size={24} />
      </button>
    </div>
  );
}


