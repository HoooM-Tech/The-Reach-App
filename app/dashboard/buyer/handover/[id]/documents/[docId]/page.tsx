'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { handoverApi, buyerApi, ApiError } from '@/lib/api/client'
import { Bell, ChevronLeft, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface DocumentDetail {
  id: string
  categoryName: string
  documentType: string
  filename: string
  url: string
  content: string | null
  size: number
  uploadedAt: string
  verifiedAt: string | null
}

/**
 * Render document content - handles plain text or HTML
 * Falls back to placeholder content if none provided
 */
function renderDocumentContent(doc: DocumentDetail) {
  if (doc.content) {
    // If content looks like HTML, render it
    if (doc.content.startsWith('<')) {
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
      )
    }
    // Otherwise render as plain text with line breaks
    return (
      <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
        {doc.content}
      </div>
    )
  }

  // If there's a URL for a PDF/document, show a link
  if (doc.url) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm mb-4">
          This document is available for download.
        </p>
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#E54D4D] text-white rounded-xl font-semibold text-sm"
        >
          Open Document
        </a>
      </div>
    )
  }

  return (
    <p className="text-gray-500 text-sm text-center py-8">
      Document content is not available.
    </p>
  )
}

export default function BuyerHandoverDocumentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string; docId: string }>()
  const handoverId = params?.id
  const docId = params?.docId

  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    const fetchDocument = async () => {
      if (!handoverId || !docId) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await handoverApi.getHandoverDocument(handoverId, docId)
        setDocument(response)
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to load document'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDocument()
  }, [handoverId, docId])

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

  if (error || !document) {
    return (
      <div className="min-h-screen bg-[#F5F0EB]">
        <header className="px-4 py-3 flex items-center justify-between bg-white border-b border-gray-100">
          <button onClick={() => router.back()} aria-label="Go back">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Document</h1>
          <div className="w-10 h-10" />
        </header>
        <div className="px-4 pt-12 text-center">
          <p className="text-gray-600">{error || 'Document not found'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-[#E54D4D] text-white rounded-lg text-sm font-semibold"
          >
            Go Back
          </button>
        </div>
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
        <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-none">
          {document.categoryName}
        </h1>
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

      {/* Document Content */}
      <div className="px-4 pt-6 pb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm max-w-3xl mx-auto">
          {renderDocumentContent(document)}
        </div>
      </div>
    </div>
  )
}
