'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { buyerApi, ApiError } from '@/lib/api/client'
import { useUser } from '@/contexts/UserContext'
import {
  AlertCircle,
  Bell,
  Calendar,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react'
import { parseTimestamp } from '@/lib/utils/time'

export const dynamic = 'force-dynamic'

type InspectionStatus = 'all' | 'scheduled' | 'completed' | 'cancelled'

interface InspectionItem {
  id: string
  property_id: string
  slot_time: string
  status: string
  type?: string
  properties?: {
    title?: string
    location?: { city?: string; state?: string; address?: string }
    asking_price?: number
    minimum_price?: number
    lead_price?: number
    rating?: number
    review_count?: number
    property_media?: Array<{ url?: string; media_type?: string }>
  }
}

const statusLabelMap: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-[#F6E8E3] text-[#E54D4D]' },
  completed: { label: 'Completed', color: 'bg-[#E7F6ED] text-[#2E7D32]' },
  cancelled: { label: 'Cancelled', color: 'bg-[#FDECEC] text-[#C62828]' },
}

function getDerivedStatus(status: string) {
  const raw = (status || '').toLowerCase()
  if (raw === 'cancelled') return 'cancelled'
  if (raw === 'completed' || raw === 'withdrawn') return 'completed'
  return 'scheduled'
}

function getCoverImage(inspection: InspectionItem) {
  const media = inspection.properties?.property_media || []
  const image = media.find((item) => item.media_type === 'image') || media[0]
  return image?.url || '/placeholder-property.jpg'
}

function getPriceLabel(inspection: InspectionItem) {
  const price =
    inspection.properties?.asking_price ??
    inspection.properties?.minimum_price ??
    inspection.properties?.lead_price

  if (!price) return '₦0'
  return `₦${Number(price).toLocaleString()}`
}

export default function BuyerInspectionsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [inspections, setInspections] = useState<InspectionItem[]>([])
  const [counts, setCounts] = useState({
    all: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  })
  const [activeTab, setActiveTab] = useState<InspectionStatus>('all')
  const [searchValue, setSearchValue] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    setAppliedSearch(searchValue.trim())
  }

  const fetchInspections = async (pageNumber: number, replace = false) => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await buyerApi.getInspections({
        status: activeTab,
        q: appliedSearch || undefined,
        page: pageNumber,
        limit: 10,
      })

      setCounts(response.counts)
      setHasMore(response.pagination.page < response.pagination.totalPages)
      setInspections((prev) =>
        replace ? response.inspections : [...prev, ...response.inspections]
      )
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load inspections'
      setError(message)
      console.error('Inspections fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    setInspections([])
    setPage(1)
    fetchInspections(1, true)
  }, [user?.id, activeTab, appliedSearch])

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

  const tabs = useMemo(
    () => [
      { key: 'all' as InspectionStatus, label: 'All', count: counts.all },
      { key: 'scheduled' as InspectionStatus, label: 'Scheduled', count: counts.scheduled },
      { key: 'completed' as InspectionStatus, label: 'Completed', count: counts.completed },
      { key: 'cancelled' as InspectionStatus, label: 'Cancelled', count: counts.cancelled },
    ],
    [counts]
  )

  return (
    <div className="min-h-screen bg-reach-light px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Inspections</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track every inspection and keep payments on schedule.
            </p>
          </div>
          {/*
          <button
            onClick={() => router.push('/dashboard/notifications')}
            className="relative w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell size={18} className="text-gray-700" />
            {hasUnread && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#E54D4D]" />
            )}
          </button>
          */}
        </div>

        <div className="flex flex-col gap-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search inspections by location or property..."
                className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-[#E54D4D]/20 focus:border-[#E54D4D] text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="h-11 w-11 flex items-center justify-center bg-white border border-gray-100 rounded-xl"
                aria-label="Open filters"
              >
                <SlidersHorizontal size={18} className="text-gray-600" />
              </button>
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-[#E54D4D] text-white text-sm font-semibold"
              >
                Search
              </button>
            </div>
          </form>

          {isFilterOpen && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    setIsFilterOpen(false)
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#E54D4D] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#E54D4D] text-white'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {isLoading && inspections.length === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
              >
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load inspections</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchInspections(page, inspections.length === 0)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E54D4D] text-white rounded-lg"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !error && inspections.length === 0 && (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-100">
            <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No inspections found
            </h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              Book an inspection to see it here.
            </p>
            <button
              onClick={() => router.push('/properties')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E54D4D] text-white rounded-xl font-medium"
            >
              Browse Properties
            </button>
          </div>
        )}

        {!error && inspections.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inspections.map((inspection) => {
                const derivedStatus = getDerivedStatus(inspection.status)
                const statusInfo = statusLabelMap[derivedStatus] || statusLabelMap.scheduled
                const location = inspection.properties?.location
                const rating = inspection.properties?.rating || 0
                const reviewCount = inspection.properties?.review_count || 0

                return (
                  <button
                    key={inspection.id}
                    onClick={() => router.push(`/dashboard/buyer/inspections/${inspection.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden text-left hover:shadow-lg transition-all"
                  >
                    <div className="relative h-40">
                      <Image
                        src={getCoverImage(inspection)}
                        alt={inspection.properties?.title || 'Property'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        loading="lazy"
                      />
                      <span
                        className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                        <MoreHorizontal size={16} className="text-gray-600" />
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {reviewCount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Star size={14} className="text-[#E54D4D]" />
                          <span className="font-medium text-gray-700">
                            {rating.toFixed(1)}
                          </span>
                          <span>({reviewCount} reviews)</span>
                        </div>
                      )}
                      <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                        {inspection.properties?.title || 'Property Inspection'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin size={14} />
                        <span className="line-clamp-1">
                          {location?.city || 'Unknown city'}
                          {location?.state ? `, ${location.state}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-base font-semibold text-gray-900">
                          {getPriceLabel(inspection)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {parseTimestamp(inspection.slot_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    fetchInspections(nextPage)
                  }}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

