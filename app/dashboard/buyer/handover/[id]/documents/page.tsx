'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { handoverApi, buyerApi, ApiError } from '@/lib/api/client'
import {
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DocumentCategory {
  id: string
  name: string
  required: boolean
  order: number
  uploaded: boolean
  signed: boolean
  document: {
    id: string
    filename: string
    url: string
    size: number
    uploadedAt: string
    verifiedAt: string | null
  } | null
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BuyerHandoverDocumentsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const handoverId = params?.id

  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [allSigned, setAllSigned] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [reviewedDocIds, setReviewedDocIds] = useState<Set<string>>(new Set())

  const fetchDocuments = useCallback(async () => {
    if (!handoverId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await handoverApi.getHandoverDocuments(handoverId)
      setCategories(response.categories || [])
      setAllSigned(response.allSigned)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load documents'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [handoverId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

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

  const toggleCategory = (categoryId: string) => {
    setExpandedIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleViewDocument = (docId: string, categoryId: string) => {
    setReviewedDocIds((prev) => new Set(prev).add(categoryId))
    router.push(`/dashboard/buyer/handover/${handoverId}/documents/${docId}`)
  }

  const uploadedCategories = categories.filter((c) => c.uploaded)
  const allUploadedReviewed =
    uploadedCategories.length > 0 &&
    uploadedCategories.every((c) => reviewedDocIds.has(c.id) || c.signed)

  const handleSignAndReview = async () => {
    if (!handoverId) return
    setIsSigning(true)
    setError(null)
    try {
      await handoverApi.signHandoverDocuments(handoverId)
      router.push(`/dashboard/buyer/handover/${handoverId}/sign-complete`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to sign documents'
      setError(message)
    } finally {
      setIsSigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#E54D4D]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between bg-white border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">View Documents</h1>
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

      {/* Error */}
      {error && (
        <div className="px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchDocuments}
              className="mt-2 inline-flex items-center gap-1 text-sm text-red-600 font-medium"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Document Categories */}
      <div className="px-4 pt-6 space-y-3 pb-32">
        {categories.map((category) => {
          const isExpanded = expandedIds.includes(category.id)
          const isUploaded = category.uploaded
          const isSigned = category.signed || allSigned

          return (
            <div
              key={category.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-base text-gray-900">
                    {category.name}
                  </span>
                  {isUploaded && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expanded Content */}
              {isExpanded && category.document && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {category.document.filename}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatFileSize(category.document.size)} &bull; Uploaded{' '}
                        {formatRelativeDate(category.document.uploadedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleViewDocument(category.document!.id, category.id)
                      }
                      className="ml-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                      aria-label={`View ${category.name}`}
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* No Document Uploaded */}
              {isExpanded && !category.document && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 pt-4">
                    Document not uploaded yet
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 px-4 py-4 bg-white border-t border-gray-200 safe-bottom">
        {allSigned ? (
          <p className="text-center text-gray-400 text-sm">Signed &amp; Completed</p>
        ) : allUploadedReviewed && uploadedCategories.length > 0 ? (
          <button
            onClick={handleSignAndReview}
            disabled={isSigning}
            className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg disabled:opacity-60"
          >
            {isSigning ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" /> Signing...
              </span>
            ) : (
              'Signed & Reviewed'
            )}
          </button>
        ) : (
          <p className="text-center text-gray-400 text-sm">
            {uploadedCategories.length === 0
              ? 'Waiting for documents to be uploaded'
              : 'Review all documents to proceed'}
          </p>
        )}
      </div>
    </div>
  )
}
