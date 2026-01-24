'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, ApiError, getAccessToken } from '@/lib/api/client';
import { 
  ArrowLeft,
  Bell,
  Copy,
  Share2,
  CheckCircle,
  Users,
  MousePointer,
  RefreshCw,
  AlertCircle,
  Pause,
  XCircle,
  Star,
  MapPin,
  Bed,
  Bath,
  Square,
  CheckCircle2,
  Download
} from 'lucide-react';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function PropertyPromotionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const promotionId = (params?.id as string) || '';

  const [promotion, setPromotion] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloadingMediaKit, setIsDownloadingMediaKit] = useState(false);

  const handlePause = async () => {
    if (!promotionId) return;
    setIsUpdatingStatus(true);
    try {
      await creatorApi.pausePromotion(promotionId);
      toast.success('Promotion paused successfully');
      // Refresh data
      const fetchData = async () => {
        try {
          const [promoData, analyticsData] = await Promise.all([
            creatorApi.getPromotionDetails(promotionId),
            creatorApi.getPromotionAnalytics(promotionId, timePeriod),
          ]);
          setPromotion(promoData.promotion);
          setProperty(promoData.property);
          setAnalytics(analyticsData);
        } catch (err) {
          console.error('Error refreshing data:', err);
        }
      };
      await fetchData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to pause promotion';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResume = async () => {
    if (!promotionId) return;
    setIsUpdatingStatus(true);
    try {
      await creatorApi.resumePromotion(promotionId);
      toast.success('Promotion resumed successfully');
      // Refresh data
      const fetchData = async () => {
        try {
          const [promoData, analyticsData] = await Promise.all([
            creatorApi.getPromotionDetails(promotionId),
            creatorApi.getPromotionAnalytics(promotionId, timePeriod),
          ]);
          setPromotion(promoData.promotion);
          setProperty(promoData.property);
          setAnalytics(analyticsData);
        } catch (err) {
          console.error('Error refreshing data:', err);
        }
      };
      await fetchData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to resume promotion';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStop = async () => {
    if (!promotionId) return;
    if (!confirm('Are you sure you want to stop this promotion? This action cannot be undone.')) {
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await creatorApi.stopPromotion(promotionId);
      toast.success('Promotion stopped successfully');
      // Refresh data
      const fetchData = async () => {
        try {
          const [promoData, analyticsData] = await Promise.all([
            creatorApi.getPromotionDetails(promotionId),
            creatorApi.getPromotionAnalytics(promotionId, timePeriod),
          ]);
          setPromotion(promoData.promotion);
          setProperty(promoData.property);
          setAnalytics(analyticsData);
        } catch (err) {
          console.error('Error refreshing data:', err);
        }
      };
      await fetchData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to stop promotion';
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (!promotionId || !user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch promotion details
        const promotionData = await creatorApi.getPromotionDetails(promotionId);
        setPromotion(promotionData.promotion);
        setProperty(promotionData.property);

        // Fetch analytics
        const analyticsData = await creatorApi.getPromotionAnalytics(promotionId, timePeriod);
        setAnalytics(analyticsData);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load promotion details';
        setError(message);
        console.error('Promotion details fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [promotionId, user?.id, timePeriod]);

  const handleCopyLink = async () => {
    if (!promotion?.tracking_link) return;

    try {
      await navigator.clipboard.writeText(promotion.tracking_link);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
      console.error('Copy error:', err);
    }
  };

  const handleShare = async () => {
    if (!promotion?.tracking_link || !property) return;

    const shareData = {
      title: property.title || 'Property',
      text: `Check out this amazing property: ${property.title}`,
      url: promotion.tracking_link,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        // Use native share (mobile & modern browsers)
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(promotion.tracking_link);
        toast.success('Link copied to clipboard! Share it anywhere.');
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        // Fallback to copy
        try {
          await navigator.clipboard.writeText(promotion.tracking_link);
          toast.success('Link copied! Share it manually.');
        } catch {
          toast.error('Failed to copy link');
        }
      }
    }
  };

  const handleDownloadMediaKit = async () => {
    if (!property?.id) return;

    setIsDownloadingMediaKit(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('Please log in to download media kit');
        return;
      }

      const response = await fetch(`/api/creator/properties/${property.id}/media-kit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to download media kit' }));
        throw new Error(errorData.error || 'Failed to download media kit');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `property-${property.id}-media-kit.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Media kit downloaded successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download media kit';
      toast.error(message);
      console.error('Media kit download error:', err);
    } finally {
      setIsDownloadingMediaKit(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `₦${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `₦${(price / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-reach-bg p-4 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !promotion || !property) {
    return (
      <div className="min-h-screen bg-reach-bg p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load promotion</h3>
            <p className="text-gray-600 mb-4">{error || 'Promotion not found'}</p>
            <button
              onClick={() => router.push('/dashboard/creator/my-promotions')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-lg hover:bg-reach-primary/90 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Promotions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const primaryImage = property.images?.[0] || null;

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            title="Back"
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Property Details</h1>
            {promotion?.status && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                promotion.status === 'active' ? 'bg-green-100 text-green-700' :
                promotion.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                promotion.status === 'expired' ? 'bg-red-100 text-red-700' :
                promotion.status === 'stopped' ? 'bg-gray-100 text-gray-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  promotion.status === 'active' ? 'bg-green-500' :
                  promotion.status === 'paused' ? 'bg-orange-500' :
                  promotion.status === 'expired' ? 'bg-red-500' :
                  promotion.status === 'stopped' ? 'bg-gray-500' :
                  'bg-gray-500'
                }`} />
                {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
              </span>
            )}
          </div>
          <button className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors" title="Notifications" aria-label="Notifications">
            <Bell size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Property Info Card */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {/* Property Image */}
          <div className="relative aspect-[16/9] bg-gray-100">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt={property.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400">No Image</span>
              </div>
            )}
            {property.verification_status === 'verified' && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
                <CheckCircle2 size={12} />
                Verified
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="p-6 space-y-4">
            {/* Price and Rating */}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(property.price)}
              </span>
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium text-gray-900">4.8(20)</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900">{property.title}</h2>

            {/* Address */}
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={16} className="text-red-500" />
              <span className="text-sm">{property.address}</span>
            </div>

            {/* Amenities */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Bed size={16} />
                <span>4 Beds</span>
              </div>
              <div className="flex items-center gap-1">
                <Bath size={16} />
                <span>3 Bathroom</span>
              </div>
              <div className="flex items-center gap-1">
                <Square size={16} />
                <span>1,400 sqft</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Link Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Your Tracking Link</h3>
          
          <div className="flex items-center gap-2">
            <input
              title="Tracking link"
              type="text"
              value={promotion.tracking_link || ''}
              readOnly
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Copy link"
            >
              {copied ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <Copy size={20} className="text-gray-600" />
              )}
            </button>
            <button
              onClick={handleShare}
              className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Share link"
            >
              <Share2 size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Media Kit Download Section */}
        {property && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Media Kit</h3>
                <p className="text-sm text-gray-600">Download property images and videos for promotion</p>
              </div>
              <button
                onClick={handleDownloadMediaKit}
                disabled={isDownloadingMediaKit}
                className="flex items-center gap-2 px-4 py-2 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                {isDownloadingMediaKit ? 'Preparing...' : 'Download Media Kit'}
              </button>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {analytics && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Analytics</h3>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Leads Card */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Leads</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.stats.leads.value}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-green-600 font-medium">↗ {analytics.stats.leads.change}%</span>
                  <span className="text-gray-500">From last 30 days</span>
                </div>
              </div>

              {/* Clicks Card */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <MousePointer size={20} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Clicks</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.stats.clicks.value}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-green-600 font-medium">↗ {analytics.stats.clicks.change}%</span>
                  <span className="text-gray-500">From last 30 days</span>
                </div>
              </div>
            </div>

            {/* Time Period Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    timePeriod === period
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Leads & conversion Activity</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="conversions" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inspections" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="leads" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-gray-600">Leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-gray-600">Inspections</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="text-gray-600">Conversions</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {promotion?.status === 'active' ? (
            <button
              onClick={handlePause}
              disabled={isUpdatingStatus}
              className="flex-1 py-3 px-6 bg-white border-2 border-reach-primary text-reach-primary rounded-full font-medium hover:bg-reach-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Pause size={18} />
              {isUpdatingStatus ? 'Pausing...' : 'Pause'}
            </button>
          ) : promotion?.status === 'paused' || promotion?.status === 'expired' ? (
            <button
              onClick={handleResume}
              disabled={isUpdatingStatus}
              className="flex-1 py-3 px-6 bg-reach-primary text-white rounded-full font-medium hover:bg-reach-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              {isUpdatingStatus ? 'Resuming...' : 'Resume'}
            </button>
          ) : null}
          {promotion?.status !== 'stopped' && (
            <button
              onClick={handleStop}
              disabled={isUpdatingStatus}
              className="flex-1 py-3 px-6 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <XCircle size={18} />
              {isUpdatingStatus ? 'Stopping...' : 'Stop promotion'}
            </button>
          )}
          {promotion?.status === 'expired' && (
            <div className="flex-1 py-3 px-6 bg-orange-50 border-2 border-orange-200 text-orange-700 rounded-full font-medium text-center">
              Promotion Expired
            </div>
          )}
          {promotion?.status === 'stopped' && (
            <div className="flex-1 py-3 px-6 bg-gray-100 border-2 border-gray-300 text-gray-600 rounded-full font-medium text-center">
              Promotion Stopped
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
