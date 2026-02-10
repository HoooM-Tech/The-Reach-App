'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { formatInspectionDate, formatInspectionTimeOnly, getDayOfWeek, parseTimestamp, isBefore } from '@/lib/utils/time';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Calendar, 
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Building2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ===========================================
// Status Badge Component
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    booked: { label: 'Booked', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
    pending: { label: 'Pending', color: 'bg-orange-100 text-orange-700', icon: <Clock size={12} /> },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={12} /> },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
    withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700', icon: <XCircle size={12} /> },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ===========================================
// Cancel Confirmation Modal
// ===========================================

function CancelConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Cancel Inspection</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to cancel this inspection? The buyer will be notified.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            Keep Inspection
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Schedule Details Modal (same as property details page)
// ===========================================

function ScheduleDetailsModal({
  isOpen,
  onClose,
  inspection,
  locationString,
  canConfirm,
  canShowRescheduleConfirm,
  onConfirm,
  isConfirming,
  onReschedule,
}: {
  isOpen: boolean;
  onClose: () => void;
  inspection: any;
  locationString: string;
  canConfirm: boolean;
  canShowRescheduleConfirm: boolean;
  onConfirm: () => void;
  isConfirming: boolean;
  onReschedule: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900">Schedule details</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{getDayOfWeek(inspection?.slot_time)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} className="text-gray-400" />
            <span>{inspection?.slot_time ? formatInspectionDate(inspection.slot_time) : '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} className="text-gray-400" />
            <span>{inspection?.slot_time ? formatInspectionTimeOnly(inspection.slot_time) : '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin size={16} className="text-red-500" />
            <span>{locationString}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={16} className="text-gray-400" />
            <span>{inspection?.leads?.buyer_name || '—'}</span>
          </div>
          {(inspection?.reminder_days != null && inspection.reminder_days >= 0) && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 text-sm mb-1">Reminder</h4>
              <p className="text-sm text-gray-600">Notify {inspection.reminder_days} day before due date</p>
            </div>
          )}
          {canShowRescheduleConfirm && (
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={onReschedule}
                className="flex-1 min-w-[120px] px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Re-schedule
              </button>
              {canConfirm && (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isConfirming}
                  className="flex-1 min-w-[120px] px-4 py-2.5 bg-[#15355A] text-white rounded-xl font-medium hover:bg-[#0f2842] transition-colors disabled:opacity-60"
                >
                  {isConfirming ? 'Confirming...' : 'Confirm'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Complete Inspection Modal
// ===========================================

function CompleteInspectionModal({
  inspection,
  isOpen,
  onClose,
  onConfirm,
}: {
  inspection: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updated: any) => void;
}) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!inspection?.id) return;
    try {
      setIsSubmitting(true);
      const res = await developerApi.completeInspection(inspection.id, {
        notes: notes.trim() || undefined,
        completedAt: new Date().toISOString(),
      });
      const data = res as { success?: boolean; inspection?: any; error?: string };
      if (data.success !== false && data.inspection) {
        toast.success('Inspection marked as complete');
        onConfirm(data.inspection);
        onClose();
      } else {
        toast.error((data as { error?: string }).error || 'Failed to complete inspection');
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const propertyTitle = inspection?.properties?.title || 'this property';
  const buyerName = inspection?.leads?.buyer_name || 'the buyer';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-center">Complete Inspection</h2>
        <p className="text-gray-600 text-center text-sm">
          Confirm that the physical inspection for <strong>{propertyTitle}</strong> has been completed with {buyerName}.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about the inspection..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Page
// ===========================================

export default function DeveloperInspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const inspectionId = (params?.id as string) || '';
  
  const [inspection, setInspection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch inspection from dashboard API
  const fetchInspection = useCallback(async () => {
    if (!inspectionId || !user?.id) return;

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
      const res = await developerApi.getInspectionDetails(inspectionId);
      const data = res as { inspection?: any };
      if (!abortController.signal.aborted) {
        if (data.inspection) {
          setInspection(data.inspection);
        } else {
          setError('Inspection not found');
        }
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load inspection';
      setError(message);
      console.error('Inspection fetch error:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [inspectionId, user?.id]);

  useEffect(() => {
    if (!inspectionId) {
      router.push('/dashboard/developer/inspections');
      return;
    }

    if (!user) {
      // Wait for user to load
      return;
    }

    fetchInspection();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [inspectionId, user, fetchInspection, router]);

  // Handle cancel inspection
  const handleCancelInspection = async () => {
    if (!inspectionId) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      await developerApi.cancelInspection(inspectionId);
      setIsCancelModalOpen(false);
      await fetchInspection();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel inspection';
      setCancelError(message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmInspection = async () => {
    if (!inspectionId) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      await developerApi.confirmInspection(inspectionId);
      toast.success('Inspection confirmed. The buyer has been notified.');
      await fetchInspection();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to confirm inspection';
      setConfirmError(message);
      toast.error(message);
    } finally {
      setIsConfirming(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !inspection) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Inspection not found</h3>
            <p className="text-gray-600 mb-4">{error || 'This inspection may have been removed or is no longer available.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard/developer/inspections')}
                className="px-6 py-3 bg-[#15355A] text-white rounded-xl font-medium"
              >
                Back to Inspections
              </button>
              <button
                onClick={fetchInspection}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center gap-2"
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

  // State-driven UI from inspection.status (from API/Supabase). No local-only state for status.
  const inspectionDate = parseTimestamp(inspection.slot_time);
  const currentStatus = (inspection.status || '').toLowerCase();
  const canCancel = currentStatus === 'booked' || currentStatus === 'pending' || currentStatus === 'confirmed';
  const scheduledTimePassed = inspection.slot_time && isBefore(inspection.slot_time, new Date().toISOString());
  // Allow "Mark as Complete" when slot has passed and status is confirmed OR still booked (developer can complete without having confirmed first)
  const canComplete = scheduledTimePassed && (currentStatus === 'confirmed' || currentStatus === 'booked');
  // Show "Confirm Inspection" only when status is booked or pending (e.g. after buyer reschedule); hide when already confirmed/cancelled/completed
  const canConfirm = (currentStatus === 'booked' || currentStatus === 'pending') && !scheduledTimePassed;
  const propLocation = inspection.properties?.location;
  const locationString = inspection.address || propLocation?.address || (propLocation?.city && propLocation?.state ? `${propLocation.city}, ${propLocation.state}` : propLocation?.city || propLocation?.state || 'Address not specified');

  return (
    <div className="p-6 pb-24 lg:pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inspection Details</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={inspection.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              className="flex flex-1 min-w-0 items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors sm:flex-initial"
            >
              <Calendar size={18} className="flex-shrink-0" />
              <span className="truncate">Schedule details</span>
            </button>
          </div>
        </div>

        {/* Confirm error banner */}
        {confirmError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {confirmError}
          </div>
        )}
        {/* Cancel error banner */}
        {cancelError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {cancelError}
          </div>
        )}

        {/* Cancelled banner */}
        {currentStatus === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle size={18} />
              <span className="font-semibold">This inspection has been cancelled</span>
            </div>
            {inspection.cancelled_by && (
              <p className="text-sm text-red-600 mt-1">
                Cancelled by {inspection.cancelled_by === 'developer' ? 'you' : inspection.cancelled_by}
                {inspection.cancelled_at && ` on ${parseTimestamp(inspection.cancelled_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </p>
            )}
          </div>
        )}

        {/* Property Info */}
        {inspection.properties && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Property</h2>
            <button
              onClick={() => router.push(`/dashboard/developer/properties/${inspection.property_id}`)}
              className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="text-[#15355A]" size={24} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{inspection.properties.title}</p>
                  {inspection.properties.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin size={14} />
                      <span>
                        {inspection.properties.location.city}, {inspection.properties.location.state}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Scheduled Inspection – same layout as property details page */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Scheduled Inspection</h3>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{getDayOfWeek(inspection.slot_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} className="text-gray-400" />
              <span>{formatInspectionDate(inspection.slot_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={16} className="text-gray-400" />
              <span>{formatInspectionTimeOnly(inspection.slot_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} className="text-red-500" />
              <span>{locationString}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={16} className="text-gray-400" />
              <span>{inspection.leads?.buyer_name || '1'}</span>
            </div>
          </div>

          {(inspection.reminder_days != null && inspection.reminder_days >= 0) && (
            <div className="mb-4 pt-3 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 text-sm mb-1">Reminder</h4>
              <p className="text-sm text-gray-600">Notify {inspection.reminder_days} day before due date</p>
            </div>
          )}

          {(currentStatus === 'booked' || currentStatus === 'pending' || currentStatus === 'confirmed') && (
            <div className="flex flex-wrap gap-3">
              {inspection.property_id && (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/developer/properties/${inspection.property_id}/reschedule`)}
                  className="flex-1 min-w-[120px] px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Re-schedule
                </button>
              )}
              {(currentStatus === 'booked' || currentStatus === 'pending') && (
                <button
                  type="button"
                  onClick={handleConfirmInspection}
                  disabled={isConfirming}
                  className="flex-1 min-w-[120px] px-4 py-2.5 bg-[#15355A] text-white rounded-xl font-medium hover:bg-[#0f2842] transition-colors disabled:opacity-60"
                >
                  {isConfirming ? 'Confirming...' : 'Confirm'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Buyer Information */}
        {inspection.leads && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Buyer Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#15355A]/10 rounded-full flex items-center justify-center">
                  <User className="text-[#15355A]" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{inspection.leads.buyer_name}</p>
                </div>
              </div>
              
              {inspection.leads.buyer_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#15355A]/10 rounded-full flex items-center justify-center">
                    <Phone className="text-[#15355A]" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{inspection.leads.buyer_phone}</p>
                  </div>
                </div>
              )}
              
              {inspection.leads.buyer_email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#15355A]/10 rounded-full flex items-center justify-center">
                    <Mail className="text-[#15355A]" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{inspection.leads.buyer_email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion info (when completed) */}
        {currentStatus === 'completed' && (inspection.completed_at || inspection.completion_notes) && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">Completion</h2>
            {inspection.completed_at && (
              <p className="text-sm text-gray-600 mb-2">
                Completed on {parseTimestamp(inspection.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            {inspection.completion_notes && (
              <p className="text-sm text-gray-600 leading-relaxed">{inspection.completion_notes}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {inspection.notes && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{inspection.notes}</p>
          </div>
        )}

        {/* Action buttons – bottom */}
        {(canConfirm || canComplete || canCancel) && (
          <div className="flex flex-wrap gap-3 pt-2">
            {canConfirm && (
              <button
                onClick={handleConfirmInspection}
                disabled={isConfirming}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#15355A] text-white rounded-xl font-medium hover:bg-[#0f2842] transition-colors disabled:opacity-60"
              >
                <CheckCircle size={18} className="flex-shrink-0" />
                <span className="truncate">{isConfirming ? 'Confirming...' : 'Confirm inspection'}</span>
              </button>
            )}
            {canComplete && (
              <button
                onClick={() => setIsCompleteModalOpen(true)}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                <CheckCircle size={18} className="flex-shrink-0" />
                <span className="truncate">Mark as Complete</span>
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl font-medium hover:bg-red-50 transition-colors"
              >
                <X size={18} className="flex-shrink-0" />
                <span className="truncate">Cancel</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Complete Inspection Modal */}
      <CompleteInspectionModal
        inspection={inspection}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={async () => {
          setIsCompleteModalOpen(false);
          await fetchInspection();
        }}
      />

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelError(null);
        }}
        onConfirm={handleCancelInspection}
        isSubmitting={isCancelling}
      />

      {/* Schedule Details Modal – same as property details page */}
      <ScheduleDetailsModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        inspection={inspection}
        locationString={locationString}
        canConfirm={canConfirm}
        canShowRescheduleConfirm={currentStatus === 'booked' || currentStatus === 'pending' || currentStatus === 'confirmed'}
        onConfirm={() => {
          setShowScheduleModal(false);
          handleConfirmInspection();
        }}
        isConfirming={isConfirming}
        onReschedule={() => {
          setShowScheduleModal(false);
          if (inspection.property_id) router.push(`/dashboard/developer/properties/${inspection.property_id}/reschedule`);
        }}
      />
    </div>
  );
}
