'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError, getAccessToken } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Bell,
  MapPin, 
  Bed, 
  Bath,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  Eye,
  User,
  Calendar,
  ChevronRight,
  MoreVertical,
  Star,
  FileText,
  ArrowUpRight,
  Building2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Types
// ===========================================

interface PropertyDetails {
  property: any;
  stats: { views: number; leads: number };
  bid: { amount: number; id: string } | null;
  note: { note_text: string; id: string } | null;
  inspection: {
    id: string;
    slot_time: string;
    status: string;
    type: string;
    buyer_name?: string;
    buyer_email?: string;
    buyer_phone?: string;
    address?: string;
    reminder_days: number;
  } | null;
  contract: { id: string; contract_url: string } | null;
  rejectionFeedback: string | null;
}

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string }> = {
    verified: {
      label: 'Verified',
      bgColor: 'bg-emerald-500',
      textColor: 'text-white',
      dotColor: 'bg-emerald-600',
    },
    pending_verification: {
      label: 'Pending',
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      dotColor: 'bg-orange-600',
    },
    submitted: {
      label: 'Pending',
      bgColor: 'bg-orange-500',
      textColor: 'text-white',
      dotColor: 'bg-orange-600',
    },
    draft: {
      label: 'Draft',
      bgColor: 'bg-gray-500',
      textColor: 'text-white',
      dotColor: 'bg-gray-600',
    },
    rejected: {
      label: 'Rejected',
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      dotColor: 'bg-red-600',
    },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperPropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const propertyId = (params?.id as string) || '';
  
  const [details, setDetails] = useState<PropertyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch property details
  const fetchPropertyDetails = useCallback(async () => {
    if (!propertyId || !user?.id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch(`/api/properties/${propertyId}/details`, {
        signal: abortController.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load property details');
      }

      const data = await response.json();
      
      if (!abortController.signal.aborted) {
        setDetails(data);
      }
    } catch (err: any) {
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : err.message || 'Failed to load property';
      setError(message);
      console.error('Property fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [propertyId, user?.id]);

  useEffect(() => {
    if (!propertyId) {
      router.push('/dashboard/developer/properties');
      return;
    }

    if (!user) {
      return;
    }

    fetchPropertyDetails();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [propertyId, user, fetchPropertyDetails, router]);

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `₦${(price / 1000000).toFixed(0)}M`;
    }
    if (price >= 1000) {
      return `₦${(price / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Get day of week
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Handle confirm inspection
  const handleConfirmInspection = async () => {
    if (!details?.inspection) return;

    try {
      const token = getAccessToken();
      const response = await fetch(`/api/inspections/${details.inspection.id}/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        await fetchPropertyDetails();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Failed to confirm inspection');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to confirm inspection');
    }
  };

  // Check for reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-reach-bg p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="aspect-[4/3] bg-gray-200 rounded-2xl" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !details) {
    return (
      <div className="min-h-screen bg-reach-bg p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Property not found</h3>
            <p className="text-gray-600 mb-4">{error || 'This property may have been removed or is no longer available.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/developer/properties')}
                className="px-6 py-3 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 transition-colors"
              >
                Back to Properties
              </button>
              <button
                onClick={fetchPropertyDetails}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { property, stats, bid, note, inspection, contract, rejectionFeedback } = details;
  const status = property.verification_status || property.status || 'draft';
  const isVerified = status === 'verified';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending_verification' || status === 'submitted';
  const primaryImage = property.media?.[0]?.url;

  // Get location string
  const locationString = property.location?.address 
    ? property.location.address
    : property.location?.city && property.location?.state
    ? `${property.location.city}, ${property.location.state}`
    : property.location?.city || property.location?.state || 'Location not specified';

  return (
    <div className="min-h-screen bg-reach-bg pb-24 lg:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="sticky top-0 bg-reach-bg z-40 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/developer/properties')}
            className="p-2 rounded-full bg-white hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Property Details</h1>
          <button
            onClick={() => router.push('/notifications')}
            className="p-2 rounded-full bg-white hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={20} className="text-gray-700" />
          </button>
        </header>

        {/* Property Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          className="bg-white rounded-2xl overflow-hidden shadow-sm mb-6"
        >
          {/* Property Image */}
          <div className="relative aspect-[4/3] bg-gray-100">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-16 h-16 text-gray-300" />
              </div>
            )}
            {/* Status Badge - Top Left */}
            <div className="absolute top-3 left-3">
              <StatusBadge status={status} />
            </div>
            {/* Menu Icon - Top Right */}
            <div className="absolute top-3 right-3">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
                  aria-label="More options"
                  title="More options"
                >
                  <MoreVertical size={16} className="text-gray-700" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 min-w-[120px]"
                      >
                        <button
                          onClick={() => {
                            router.push(`/dashboard/developer/properties/${property.id}/edit`);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <FileEdit size={14} />
                          Edit
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="p-4 space-y-3">
            {/* Price and Rating */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-sm">
                {formatPrice(property.asking_price || 0)}
              </span>
              <div className="flex items-center gap-1">
                <Star size={14} className="text-orange-500 fill-orange-500" />
                <span className="text-sm text-gray-600">
                  {property.rating || 4.8}({property.review_count || 20})
                </span>
              </div>
            </div>

            {/* Title */}
            <h2 className="font-semibold text-gray-900 text-lg">{property.title}</h2>

            {/* Address */}
            <div className="flex items-start gap-1.5 text-gray-500 text-sm">
              <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span>{locationString}</span>
            </div>

            {/* Amenities */}
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-sm text-gray-500">
              {property.bedrooms !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Bed size={14} />
                  <span>{property.bedrooms} Beds</span>
                </div>
              )}
              {property.bathrooms !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Bath size={14} />
                  <span>{property.bathrooms} Bathroom</span>
                </div>
              )}
              {property.sqft && (
                <div className="flex items-center gap-1.5">
                  <Square size={14} />
                  <span>{property.sqft.toLocaleString()} sqft</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Rejected State - Error Message Box */}
        {isRejected && rejectionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6"
          >
            <p className="text-red-700 text-sm mb-3">
              This property wasn't approved. one or more details didn't meet our listing requirement, please review the feedback a resubmit
            </p>
            <button
              onClick={() => router.push(`/dashboard/developer/properties/${property.id}/edit`)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-orange-500 font-medium hover:bg-gray-50 transition-colors"
            >
              <span>Reupload</span>
              <ArrowUpRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Pending State - Info Message Box */}
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6"
          >
            <p className="text-orange-700 text-sm">
              This property is undergoing verification. You'll be notified once the status changes.
            </p>
          </motion.div>
        )}

        {/* Verified State - All Sections */}
        {isVerified && (
          <div className="space-y-6">
            {/* Performance Stats */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Performance Stats</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Eye size={16} />
                    <span>{stats.views}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User size={16} />
                    <span>{stats.leads}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Status */}
            {contract && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Contract Status</h3>
                  <a
                    href={contract.contract_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 font-medium text-sm flex items-center gap-1 hover:underline"
                  >
                    View contract
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            )}

            {/* Bid Section */}
            {bid && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Bid</h3>
                  <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-sm">
                    {formatPrice(bid.amount)}
                  </span>
                </div>
              </div>
            )}

            {/* Note Section */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Note</h3>
              <textarea
                readOnly
                value={note?.note_text || 'I really love the architecture of the building but here is my budget.....'}
                className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg text-sm text-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-reach-primary/20"
                aria-label="Property note"
              />
            </div>

            {/* Scheduled Inspection */}
            {inspection && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Scheduled Inspection</h3>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">{getDayOfWeek(inspection.slot_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    <span>{formatDate(inspection.slot_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} className="text-gray-400" />
                    <span>{formatTime(inspection.slot_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="text-red-500" />
                    <span>{inspection.address || locationString}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={16} className="text-gray-400" />
                    <span>1</span>
                  </div>
                </div>

                <div className="mb-4 pt-3 border-t border-gray-100">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Reminder</h4>
                  <p className="text-sm text-gray-600">Notify {inspection.reminder_days} day before due date</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/dashboard/developer/properties/${property.id}/reschedule`)}
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Re-schedule
                  </button>
                  <button
                    onClick={handleConfirmInspection}
                    className="flex-1 px-4 py-2.5 bg-reach-primary text-white rounded-xl font-medium hover:bg-reach-primary/90 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Select Visibility Dropdown (All States) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mt-6">
          <label htmlFor="visibility-select" className="sr-only">Select visibility</label>
          <select
            id="visibility-select"
            className="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-reach-primary/20 bg-white"
            defaultValue={property.visibility || 'all_creators'}
            aria-label="Select visibility"
          >
            <option value="all_creators">All Creators</option>
            <option value="exclusive_creators">Exclusive Creators</option>
          </select>
        </div>
      </div>
    </div>
  );
}
