'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { handoverApi, buyerApi, ApiError } from '@/lib/api/client'
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function getStatusInfo(status: string) {
  const map: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Pending', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    pending_developer_docs: { label: 'Pending Documents', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    docs_submitted: { label: 'Documents Uploaded', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    docs_verified: { label: 'Documents Verified', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    reach_signed: { label: 'Ready to Sign', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    buyer_signed: { label: 'Documents Signed', color: 'text-green-700', bgColor: 'bg-green-100' },
    keys_released: { label: 'Keys Released', color: 'text-green-700', bgColor: 'bg-green-100' },
    completed: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  }
  return map[status?.toLowerCase()] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' }
}

export default function BuyerHandoverDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const handoverId = params?.id

  const [handover, setHandover] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const fetchHandover = async () => {
      if (!handoverId) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await handoverApi.getHandover(handoverId)
        setHandover(response)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load handover'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHandover()
  }, [handoverId])

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await buyerApi.getUnreadStatus()
        setHasUnread(response.hasUnread)
      } catch {
        setHasUnread(false)
      }
    }
    fetchUnread()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#E54D4D]" />
      </div>
    )
  }

  if (error || !handover) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] px-4 py-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {error || 'Handover not found'}
          </h2>
          <button
            onClick={() => router.push('/dashboard/buyer/handover')}
            className="mt-4 px-6 py-3 bg-[#E54D4D] text-white rounded-xl font-medium"
          >
            Back to Handovers
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(handover.status)
  const property = handover.property || {}
  const docsCount = handover.documents?.length || 0
  const hasSigned = !!handover.signedAt

  const steps = [
    {
      label: 'Documents Uploaded',
      completed: docsCount > 0,
      icon: <FileText size={16} />,
    },
    {
      label: 'Documents Signed',
      completed: hasSigned,
      icon: <CheckCircle size={16} />,
    },
    {
      label: 'Handover Completed',
      completed: handover.status === 'completed',
      icon: <CheckCircle size={16} />,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between bg-white border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Handover Details</h1>
        <button
          onClick={() => router.push('/dashboard/notifications')}
          className="relative w-10 h-10 rounded-full flex items-center justify-center"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-700" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500" />
          )}
        </button>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Property Info */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#F6E8E3] rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="text-[#E54D4D]" size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">
                  {property.title || 'Property'}
                </h2>
                {property.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPin size={14} className="flex-shrink-0" />
                    <span className="truncate">{property.location}</span>
                  </div>
                )}
              </div>
            </div>

            {property.price > 0 && (
              <div className="text-base font-semibold text-gray-900">
                ₦{Number(property.price).toLocaleString()}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Handover Progress</h3>
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle size={16} />
                    ) : (
                      <span className="text-sm font-medium">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={
                      step.completed
                        ? 'text-gray-900 font-medium text-sm'
                        : 'text-gray-400 text-sm'
                    }
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Info (if keys released / scheduled) */}
          {handover.keysReleasedAt && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Physical Handover</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                <span>
                  {new Date(handover.keysReleasedAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() =>
                router.push(`/dashboard/buyer/handover/${handoverId}/documents`)
              }
              className="flex-1 px-5 py-3 bg-[#E54D4D] text-white rounded-xl font-semibold text-sm text-center"
            >
              View Documents
            </button>
          </div>

          {/* Created Date */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
            <p>
              Handover initiated:{' '}
              {new Date(handover.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
