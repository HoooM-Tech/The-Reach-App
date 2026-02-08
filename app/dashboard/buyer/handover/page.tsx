'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { handoverApi, buyerApi, ApiError } from '@/lib/api/client'
import {
  AlertCircle,
  Bell,
  Building2,
  Check,
  ChevronRight,
  Lock,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface HandoverItem {
  id: string
  propertyId: string
  property: {
    id: string
    title: string
    location: string
    price: number
  }
  status: string
  documentsUploaded: boolean
  documentsSigned: boolean
  completedAt: string | null
  createdAt: string
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'action_required':
      return {
        label: 'Action Required',
        className: 'bg-green-500 text-white',
        dot: true,
      }
    case 'pending_documents':
      return {
        label: 'Pending',
        className: 'bg-gray-400 text-white',
        dot: false,
      }
    case 'documents_signed':
      return {
        label: 'Documents Signed',
        className: 'bg-blue-500 text-white',
        dot: false,
      }
    case 'scheduled':
      return {
        label: 'Scheduled',
        className: 'bg-blue-500 text-white',
        dot: false,
      }
    case 'completed':
      return {
        label: 'Completed',
        className: 'bg-gray-500 text-white',
        dot: false,
      }
    default:
      return {
        label: 'Pending',
        className: 'bg-gray-400 text-white',
        dot: false,
      }
  }
}

function HandoverCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="h-6 bg-gray-200 rounded-full w-28" />
      </div>
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-32" />
    </div>
  )
}

export default function BuyerHandoverPage() {
  const router = useRouter()
  const { user } = useUser()
  const [handovers, setHandovers] = useState<HandoverItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasActionRequired, setHasActionRequired] = useState(false)

  const fetchHandovers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await handoverApi.getHandovers(appliedSearch || undefined)
      setHandovers(response.handovers || [])
      setHasActionRequired(
        (response.handovers || []).some((h: any) => h.status === 'action_required')
      )
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load handovers'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [appliedSearch])

  useEffect(() => {
    fetchHandovers()
  }, [fetchHandovers])

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await buyerApi.getUnreadStatus()
        setUnreadCount(response.hasUnread ? 1 : 0)
      } catch {
        setUnreadCount(0)
      }
    }
    fetchUnread()
  }, [])

  const handleSearch = () => {
    setAppliedSearch(searchQuery)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Handover</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/notifications')}
            className="relative w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            className="relative w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100"
            aria-label="Menu"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
            {hasActionRequired && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 sm:px-6 lg:px-8 pb-5">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, location.."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-[#E54D4D]/20"
            />
          </div>
          <button
            onClick={handleSearch}
            className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center flex-shrink-0"
            aria-label="Filter"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <HandoverCardSkeleton key={i} />)
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to load handovers
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchHandovers}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          ) : handovers.length === 0 ? (
            <div className="text-center py-16">
              <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No handovers yet
              </h3>
              <p className="text-gray-500 mb-4 text-sm">
                Your property handovers will appear here once a purchase is completed.
              </p>
              <button
                onClick={() => router.push('/dashboard/buyer')}
                className="px-4 py-2 bg-[#E54D4D] text-white rounded-lg text-sm font-semibold"
              >
                Browse Properties
              </button>
            </div>
          ) : (
            handovers.map((handover) => {
              const badge = getStatusBadge(handover.status)
              const borderColor =
                handover.status === 'action_required'
                  ? 'border-orange-400'
                  : handover.status === 'scheduled'
                  ? 'border-green-400'
                  : handover.status === 'completed'
                  ? 'border-gray-300'
                  : 'border-gray-200'

              return (
                <div
                  key={handover.id}
                  className={`bg-white rounded-2xl p-5 border-2 shadow-sm ${borderColor}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Complete Handover
                    </h3>
                    <span
                      className={`px-3 py-1 ${badge.className} text-xs font-medium rounded-full flex items-center gap-1.5 flex-shrink-0`}
                    >
                      {badge.dot && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                      {!badge.dot && handover.status === 'completed' && (
                        <Check className="w-3 h-3" />
                      )}
                      {badge.label}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Building2 className="w-5 h-5 flex-shrink-0 text-gray-500" />
                      <span className="font-medium text-sm">
                        {handover.property.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-5 h-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm">{handover.property.location}</span>
                    </div>

                    <div className="flex items-center gap-3 text-gray-600">
                      <Lock className="w-5 h-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm">Payout</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/buyer/handover/${handover.id}/documents`
                      )
                    }
                    className="flex items-center gap-1 text-orange-600 font-medium text-sm hover:text-orange-700"
                  >
                    View Documents
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
