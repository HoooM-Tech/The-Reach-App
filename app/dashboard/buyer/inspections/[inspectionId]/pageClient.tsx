'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { buyerApi, BuyerInspection, ApiError } from '@/lib/api/client'
import { formatInspectionTimeOnly, parseTimestamp } from '@/lib/utils/time'
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  MapPin,
  MoreHorizontal,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react'

type InspectionStatus = 'scheduled' | 'completed' | 'cancelled'

function getDerivedStatus(status: string): InspectionStatus {
  const raw = (status || '').toLowerCase()
  if (raw === 'cancelled') return 'cancelled'
  if (raw === 'completed' || raw === 'withdrawn') return 'completed'
  return 'scheduled'
}

function getCoverImage(inspection: BuyerInspection) {
  const media = inspection.properties?.property_media || []
  const image = media.find((item: any) => item.media_type === 'image') || media[0]
  return image?.url || '/placeholder-property.jpg'
}

// ===========================================
// Cancel Confirmation Modal (Buyer)
// ===========================================

function CancelConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
}) {
  if (!isOpen) return null

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
              Are you sure you want to cancel this inspection? The developer will be notified.
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
  )
}

export default function BuyerInspectionDetailsClient() {
  const router = useRouter()
  const params = useParams<{ inspectionId: string }>()
  const inspectionId = params?.inspectionId
  const [inspection, setInspection] = useState<BuyerInspection | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasUnread, setHasUnread] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; available: boolean }>>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const status = useMemo(
    () => (inspection ? getDerivedStatus(inspection.status) : 'scheduled'),
    [inspection]
  )
  const rawStatus = (inspection?.status || '').toLowerCase()
  const isCompleted = rawStatus === 'completed'
  const isWithdrawn = rawStatus === 'withdrawn'

  const property = inspection?.properties as any

  const fetchInspection = async () => {
    if (!inspectionId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await buyerApi.getInspectionDetails(inspectionId)
      setInspection(response.inspection)
      setTransactions(response.transactions || [])
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load inspection'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInspection()
  }, [inspectionId])

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const unread = await buyerApi.getUnreadStatus()
        setHasUnread(unread.hasUnread)
      } catch {
        setHasUnread(false)
      }
    }
    fetchUnread()
  }, [])

  const handleLoadSlots = async () => {
    if (!inspection?.property_id || !selectedDate) return
    try {
      const response = await buyerApi.getInspectionSlots(inspection.property_id, selectedDate)
      setAvailableSlots(response.slots || [])
    } catch {
      setAvailableSlots([])
    }
  }

  const handleReschedule = async () => {
    if (!inspectionId || !selectedSlot) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      await buyerApi.rescheduleInspection(inspectionId, selectedSlot)
      setIsRescheduleOpen(false)
      setSelectedDate('')
      setSelectedSlot('')
      setAvailableSlots([])
      await fetchInspection()
      toast.success('Inspection rescheduled. Awaiting developer confirmation.')
      router.refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to reschedule'
      setActionError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelInspection = async () => {
    if (!inspectionId) return
    setIsCancelling(true)
    setCancelError(null)
    try {
      await buyerApi.cancelInspection(inspectionId)
      setIsCancelModalOpen(false)
      // Optimistically update local state
      setInspection((prev) =>
        prev ? { ...prev, status: 'cancelled' } : prev
      )
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to cancel inspection'
      setCancelError(message)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleWithdraw = async () => {
    if (!inspectionId) return
    setIsSubmitting(true)
    setActionError(null)
    try {
      await buyerApi.withdrawInspection(inspectionId)
      await fetchInspection()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to withdraw interest'
      setActionError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayment = () => {
    if (!inspectionId) return
    router.push(`/dashboard/buyer/inspections/${inspectionId}/payment`)
  }

  if (isLoading) {
    return <div className="min-h-screen bg-reach-light" />
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen bg-reach-light px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 text-center border border-gray-100">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Inspection not available</h2>
          <p className="text-gray-500 mb-4">{error || 'Unable to load inspection details.'}</p>
          <button
            onClick={() => router.push('/dashboard/buyer/inspections')}
            className="px-5 py-2 rounded-xl bg-[#15355A] text-white text-sm font-semibold"
          >
            Back to inspections
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-reach-light pb-24">
      {/* Header */}
      <div className=" top-0 z-20 bg-reach-light border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">Property Details</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Hero */}
          <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden">
            <Image
              src={getCoverImage(inspection)}
              alt={property?.title || 'Property'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 70vw"
              loading="lazy"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/90 text-gray-800">
                {status === 'scheduled' ? 'Scheduled' : status === 'completed' ? 'Completed' : 'Cancelled'}
              </span>
            </div>
            <div className="absolute top-4 right-4">
              <span className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                <MoreHorizontal size={18} className="text-gray-600" />
              </span>
            </div>
          </div>

          {/* Cancel error banner */}
          {cancelError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {cancelError}
            </div>
          )}

          {/* Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {property?.title || 'Property'}
              </h2>
              {property?.rating ? (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  {Number(property.rating).toFixed(1)}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={14} />
              <span>
                {property?.location?.address || property?.location?.city || 'Location unavailable'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {property?.bedrooms !== undefined && <span>{property.bedrooms} Beds</span>}
              {property?.bathrooms !== undefined && <span>{property.bathrooms} Baths</span>}
              {property?.sqft && <span>{Number(property.sqft).toLocaleString()} sqft</span>}
            </div>
            <p className={`text-sm text-gray-600 ${showMore ? '' : 'line-clamp-3'}`}>
              {property?.description || 'No description available.'}
            </p>
            <button
              onClick={() => setShowMore((prev) => !prev)}
              className="text-sm font-semibold text-[#15355A]"
            >
              {showMore ? 'Show less' : 'More'}
            </button>
          </div>

          {/* Scheduled/Cancelled/Completed */}
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              status === 'cancelled'
                ? 'bg-[#FDECEC] border-[#F7C7C7]'
                : status === 'completed'
                ? 'bg-[#E7F6ED] border-[#B9E4C7]'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {status === 'cancelled'
                  ? 'Cancelled Inspection'
                  : status === 'completed'
                  ? 'Completed Inspection'
                  : 'Scheduled Inspection'}
              </h3>
              {status === 'completed' && !isWithdrawn && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  <CheckCircle size={12} />
                  Completed
                </span>
              )}
              {isWithdrawn && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                  <XCircle size={12} />
                  Interest Withdrawn
                </span>
              )}
              {status === 'cancelled' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                  <XCircle size={12} />
                  Cancelled
                </span>
              )}
            </div>

            <div className="grid gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>
                  {parseTimestamp(inspection.slot_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{formatInspectionTimeOnly(inspection.slot_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{inspection.address || property?.location?.address || 'Address not provided'}</span>
              </div>
            </div>

            {isCompleted && (inspection as any)?.completed_at && (
              <p className="text-sm text-gray-600">
                Completed on {parseTimestamp((inspection as any).completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            {isCompleted && (inspection as any)?.completion_notes && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Notes from developer</p>
                <p className="text-sm text-gray-600">{(inspection as any).completion_notes}</p>
              </div>
            )}

            {status === 'cancelled' && (inspection as any)?.cancelled_by && (
              <div className="text-sm text-red-700">
                Cancelled by {(inspection as any).cancelled_by === 'buyer' ? 'you' : (inspection as any).cancelled_by}
                {(inspection as any)?.cancelled_at && ` on ${parseTimestamp((inspection as any).cancelled_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </div>
            )}

            {status === 'scheduled' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsRescheduleOpen(true)}
                  className="px-5 py-2 rounded-xl bg-[#15355A] text-white text-sm font-semibold"
                >
                  Re-schedule
                </button>
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-5 py-2 rounded-xl border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancel Inspection
                </button>
              </div>
            )}
          </div>

          {/* Withdrawn: no next steps */}
          {isWithdrawn && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Interest withdrawn</h3>
              <p className="text-sm text-gray-500">
                You have withdrawn your interest in this property after the inspection.
              </p>
              {(inspection as any)?.withdrawal_reason && (
                <p className="text-sm text-gray-600 mt-2">Reason: {(inspection as any).withdrawal_reason}</p>
              )}
            </div>
          )}

          {/* Actions for completed (not withdrawn) */}
          {isCompleted && !isWithdrawn && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h3 className="text-base font-semibold text-gray-900">Next steps</h3>
              <p className="text-sm text-gray-500">
                Proceed to property purchase or withdraw your interest in this property.
              </p>
              {actionError && (
                <p className="text-sm text-red-600">{actionError}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleWithdraw}
                  disabled={isSubmitting}
                  className="flex-1 px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  Withdraw interest
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 px-5 py-3 rounded-xl bg-[#15355A] text-white text-sm font-semibold"
                >
                  Make payment
                </button>
              </div>
              <button
                onClick={() => router.push(`/dashboard/buyer/properties/${inspection.property_id}`)}
                className="text-sm font-semibold text-[#15355A]"
              >
                Submit a bid
              </button>
            </div>
          )}

          {/* Recent payment */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Recent transactions</h3>
              <div className="space-y-3">
                {transactions.slice(0, 3).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between text-sm text-gray-600"
                  >
                    <span>₦{Number(tx.amount || 0).toLocaleString()}</span>
                    <span className="text-gray-500 capitalize">{tx.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Reschedule inspection</h3>
              <button
                onClick={() => setIsRescheduleOpen(false)}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Select date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                aria-label="Select date"
              />
              <button
                type="button"
                onClick={handleLoadSlots}
                className="mt-3 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
              >
                Load available times
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`px-3 py-2 rounded-lg text-xs border ${
                      selectedSlot === slot.time
                        ? 'bg-[#15355A] text-white border-[#15355A]'
                        : 'border-gray-200 text-gray-600'
                    } ${!slot.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {formatInspectionTimeOnly(slot.time)}
                  </button>
                ))}
              </div>
              {availableSlots.length === 0 && (
                <p className="text-sm text-gray-500">Select a date to see available slots.</p>
              )}
            </div>

            {actionError && <p className="text-sm text-red-600">{actionError}</p>}

            <button
              onClick={handleReschedule}
              disabled={!selectedSlot || isSubmitting}
              className="w-full px-5 py-3 rounded-xl bg-[#15355A] text-white text-sm font-semibold disabled:opacity-60"
            >
              Confirm reschedule
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false)
          setCancelError(null)
        }}
        onConfirm={handleCancelInspection}
        isSubmitting={isCancelling}
      />
    </div>
  )
}
