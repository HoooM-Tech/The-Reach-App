'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, DeveloperDashboardData, ApiError } from '@/lib/api/client';
import { 
  Users, 
  Phone, 
  Mail,
  Building2,
  RefreshCw,
  AlertCircle,
  Search,
  Calendar,
  ChevronRight
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Lead Card Component
// ===========================================

interface LeadCardProps {
  lead: any;
  onClick: () => void;
}

function LeadCard({ lead, onClick }: LeadCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all text-left group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#0A1628]/10 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-[#0A1628]">
              {lead.buyer_name?.[0]?.toUpperCase() || 'B'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-[#E54D4D] transition-colors">
              {lead.buyer_name}
            </h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Phone size={12} />
                {lead.buyer_phone}
              </span>
              {lead.buyer_email && (
                <span className="flex items-center gap-1">
                  <Mail size={12} />
                  {lead.buyer_email}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-[#E54D4D] transition-colors" size={20} />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Building2 size={14} />
          <span className="line-clamp-1">{lead.properties?.title || 'Property'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Calendar size={12} />
          {new Date(lead.created_at).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperLeadsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch leads from dashboard API
  const fetchLeads = useCallback(async () => {
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
      const dashboard = await developerApi.getDashboard(user.id);
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setLeads(dashboard.leads?.recent || []);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load leads';
      setError(message);
      console.error('Leads fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLeads();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLeads]);

  // Filter leads by search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredLeads(leads);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = leads.filter(lead =>
      lead.buyer_name?.toLowerCase().includes(query) ||
      lead.buyer_phone?.includes(query) ||
      lead.buyer_email?.toLowerCase().includes(query) ||
      lead.properties?.title?.toLowerCase().includes(query)
    );
    setFilteredLeads(filtered);
  }, [leads, searchQuery]);

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500 text-sm mt-1">
          {leads.length} total {leads.length === 1 ? 'lead' : 'leads'}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search leads..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A1628]/20"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-48" />
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load leads</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchLeads}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-lg"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredLeads.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No leads found' : 'No leads yet'}
          </h3>
          <p className="text-gray-500">
            {searchQuery 
              ? 'Try adjusting your search' 
              : 'Leads will appear here when buyers show interest in your properties'}
          </p>
        </div>
      )}

      {/* Leads List */}
      {!isLoading && !error && filteredLeads.length > 0 && (
        <div className="space-y-4">
          {filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => router.push(`/dashboard/developer/leads/${lead.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
