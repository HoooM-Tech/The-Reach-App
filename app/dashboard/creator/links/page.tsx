'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, ApiError } from '@/lib/api/client';
import { 
  Link2, 
  Copy, 
  ExternalLink,
  TrendingUp,
  Eye,
  MousePointer,
  Users,
  RefreshCw,
  AlertCircle,
  Building2,
  Plus,
  CheckCircle
} from 'lucide-react';

// ===========================================
// Link Card Component
// ===========================================

interface LinkCardProps {
  link: {
    id: string;
    property_id: string;
    property_title: string;
    unique_code: string;
    tracking_url: string;
    impressions: number;
    clicks: number;
    leads: number;
    conversion_rate: number;
    created_at: string;
  };
}

function LinkCard({ link }: LinkCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(link.tracking_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      {/* Property Title */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{link.property_title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Created {new Date(link.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
            title="Copy link"
          >
            {copied ? <CheckCircle size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </button>
          <a
            href={link.tracking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
            title="Open link"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Link URL */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4">
        <p className="text-xs text-gray-500 font-mono truncate">{link.tracking_url}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Eye size={14} className="mx-auto text-gray-500 mb-1" />
          <p className="text-sm font-semibold text-gray-900">{link.impressions}</p>
          <p className="text-xs text-gray-500">Views</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <MousePointer size={14} className="mx-auto text-gray-500 mb-1" />
          <p className="text-sm font-semibold text-gray-900">{link.clicks}</p>
          <p className="text-xs text-gray-500">Clicks</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Users size={14} className="mx-auto text-gray-500 mb-1" />
          <p className="text-sm font-semibold text-gray-900">{link.leads}</p>
          <p className="text-xs text-gray-500">Leads</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <TrendingUp size={14} className="mx-auto text-gray-500 mb-1" />
          <p className="text-sm font-semibold text-emerald-600">{link.conversion_rate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Rate</p>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function CreatorLinksPage() {
  const router = useRouter();
  const { user } = useUser();
  const [links, setLinks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch links from dashboard API
  const fetchLinks = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const dashboard = await creatorApi.getDashboard(user.id);
      setLinks(dashboard.performance?.by_property || []);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load links';
      setError(message);
      console.error('Links fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [user?.id]);

  // Calculate totals
  const totals = links.reduce(
    (acc, link) => ({
      impressions: acc.impressions + (link.impressions || 0),
      clicks: acc.clicks + (link.clicks || 0),
      leads: acc.leads + (link.leads || 0),
    }),
    { impressions: 0, clicks: 0, leads: 0 }
  );

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tracking Links</h1>
            <p className="text-gray-500 text-sm mt-1">
              {links.length} active {links.length === 1 ? 'link' : 'links'}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/creator/properties')}
            className="flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-xl hover:bg-reach-primary/90 transition-colors"
          >
            <Plus size={18} />
            New Link
          </button>
        </div>

        {/* Summary Stats */}
        {!isLoading && links.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{totals.impressions.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Views</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{totals.clicks.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Clicks</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
              <p className="text-2xl font-bold text-emerald-600">{totals.leads}</p>
              <p className="text-sm text-gray-500">Total Leads</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-8 bg-gray-200 rounded mb-4" />
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="h-16 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load links</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchLinks}
              className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && links.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tracking links yet</h3>
            <p className="text-gray-600 mb-6">
              Generate links for properties to start earning commissions
            </p>
            <button
              onClick={() => router.push('/dashboard/creator/properties')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 transition-colors"
            >
              <Building2 size={18} />
              Browse Properties
            </button>
          </div>
        )}

        {/* Links List */}
        {!isLoading && !error && links.length > 0 && (
          <div className="space-y-4">
            {links.map(link => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


