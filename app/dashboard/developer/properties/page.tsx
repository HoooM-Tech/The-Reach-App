'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { 
  Plus, 
  Search, 
  Building2,
  MapPin,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  RefreshCw,
  AlertCircle,
  MoreVertical
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    verified: { 
      label: 'Verified', 
      color: 'bg-emerald-100 text-emerald-700', 
      icon: <CheckCircle size={12} /> 
    },
    pending_verification: { 
      label: 'Pending', 
      color: 'bg-orange-100 text-orange-700', 
      icon: <Clock size={12} /> 
    },
    submitted: { 
      label: 'Submitted', 
      color: 'bg-blue-100 text-blue-700', 
      icon: <Clock size={12} /> 
    },
    draft: { 
      label: 'Draft', 
      color: 'bg-gray-100 text-gray-700', 
      icon: <FileEdit size={12} /> 
    },
    rejected: { 
      label: 'Rejected', 
      color: 'bg-red-100 text-red-700', 
      icon: <XCircle size={12} /> 
    },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ===========================================
// Property Card Component
// ===========================================

interface PropertyCardProps {
  property: any;
  onEdit: () => void;
  onView: () => void;
}

function PropertyCard({ property, onEdit, onView }: PropertyCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const primaryImage = property.media?.[0]?.url;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative aspect-[16/9] bg-gray-100">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-gray-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={property.verification_status || property.status} />
        </div>
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white/90 rounded-full hover:bg-white"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[120px]">
                <button
                  onClick={() => { onView(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit size={14} />
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h3>

        {property.location && (
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin size={14} />
            <span className="line-clamp-1">
              {property.location.city}, {property.location.state}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-lg font-bold text-[#0A1628]">
            {formatPrice(property.asking_price || 0)}
          </p>
          <span className="text-xs text-gray-400">
            {new Date(property.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperPropertiesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [properties, setProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch properties from real API
  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await developerApi.getMyProperties();
      setProperties(response.properties || []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(message);
      console.error('Properties fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Filter properties based on tab and search
  useEffect(() => {
    let filtered = [...properties];

    // Filter by status
    if (activeTab !== 'All') {
      filtered = filtered.filter(p => {
        const status = (p.verification_status || p.status || '').toLowerCase();
        if (activeTab === 'Verified') return status === 'verified';
        if (activeTab === 'Rejected') return status === 'rejected';
        if (activeTab === 'Pending') return status === 'pending_verification' || status === 'submitted';
        if (activeTab === 'Draft') return status === 'draft';
        return true;
      });
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.location?.city?.toLowerCase().includes(query) ||
        p.location?.state?.toLowerCase().includes(query)
      );
    }

    setFilteredProperties(filtered);
  }, [properties, activeTab, searchQuery]);

  // Tab counts
  const getCounts = () => {
    const counts: Record<string, number> = { All: properties.length };
    properties.forEach(p => {
      const status = (p.verification_status || p.status || '').toLowerCase();
      if (status === 'verified') counts.Verified = (counts.Verified || 0) + 1;
      else if (status === 'rejected') counts.Rejected = (counts.Rejected || 0) + 1;
      else if (status === 'pending_verification' || status === 'submitted') counts.Pending = (counts.Pending || 0) + 1;
      else if (status === 'draft') counts.Draft = (counts.Draft || 0) + 1;
    });
    return counts;
  };

  const counts = getCounts();

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
        <button
          onClick={() => router.push('/dashboard/developer/properties/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-xl font-medium hover:bg-[#0A1628]/90"
        >
          <Plus size={18} />
          Add Property
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search properties..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A1628]/20"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Verified', 'Pending', 'Draft', 'Rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-[#0A1628] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab} {counts[tab] ? `(${counts[tab]})` : ''}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[16/9] bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-6 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load properties</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProperties}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProperties.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || activeTab !== 'All' ? 'No properties found' : 'No properties yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || activeTab !== 'All' 
              ? 'Try adjusting your search or filters' 
              : 'Add your first property to get started'}
          </p>
          <button
            onClick={() => router.push('/dashboard/developer/properties/new')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A1628] text-white rounded-xl font-medium"
          >
            <Plus size={18} />
            Add Property
          </button>
        </div>
      )}

      {/* Properties Grid */}
      {!isLoading && !error && filteredProperties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(property => (
            <PropertyCard
              key={property.id}
              property={property}
              onView={() => router.push(`/dashboard/developer/properties/${property.id}`)}
              onEdit={() => router.push(`/dashboard/developer/properties/${property.id}/edit`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
