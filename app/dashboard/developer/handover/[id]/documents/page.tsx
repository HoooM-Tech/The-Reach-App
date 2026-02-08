'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerHandoverApi, ApiError } from '@/lib/api/client';
import {
  ChevronDown,
  ChevronUp,
  Upload,
  Check,
  Eye,
  X,
  Loader2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DocumentCategory {
  id: string;
  name: string;
  required: boolean;
  order: number;
  uploaded: boolean;
  signed: boolean;
  document: {
    id: string;
    filename: string;
    url: string;
    size: number;
    uploadedAt: string;
  } | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function HandoverDocumentsPage() {
  const router = useRouter();
  const params = useParams();
  const handoverId = params.id as string;
  const { user, isLoading: userLoading } = useUser();

  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch document categories
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await developerHandoverApi.getHandoverDocuments(handoverId);
      setCategories(data.categories || []);
      // Auto-expand first category that needs upload
      const firstEmpty = (data.categories || []).find((c: DocumentCategory) => !c.uploaded);
      if (firstEmpty) {
        setExpandedCategories([firstEmpty.id]);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError(err instanceof ApiError ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [handoverId]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    if (handoverId) {
      fetchDocuments();
    }
  }, [user, userLoading, router, handoverId, fetchDocuments]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleFileUpload = async (categoryId: string, file: File) => {
    if (!file) return;

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit.');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload jpeg, png, svg, or pdf files.');
      return;
    }

    setIsUploading(categoryId);
    try {
      await developerHandoverApi.uploadDocument(handoverId, categoryId, file);
      await fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      alert(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setIsUploading(null);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await developerHandoverApi.deleteDocument(handoverId, docId);
      await fetchDocuments();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err instanceof ApiError ? err.message : 'Delete failed');
    }
  };

  const handleViewDocument = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleContinue = async () => {
    const uploadedCount = categories.filter((c) => c.uploaded).length;
    if (uploadedCount === 0) {
      alert('Please upload at least one document before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      await developerHandoverApi.submitDocuments(handoverId);
      router.push(`/dashboard/developer/handover/${handoverId}/wait`);
    } catch (err) {
      console.error('Submit failed:', err);
      alert(err instanceof ApiError ? err.message : 'Failed to submit documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUploadedDocs = categories.some((c) => c.uploaded);

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] p-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchDocuments} className="mt-4 text-sm text-reach-primary underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Progress Indicator */}
      <div className="px-4 py-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Step 1</p>
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 bg-orange-500 rounded-full" />
          <div className="flex-1 h-1.5 bg-gray-300 rounded-full" />
          <div className="flex-1 h-1.5 bg-gray-300 rounded-full" />
        </div>
      </div>

      {/* Document Categories */}
      <div className="px-4 pt-2 space-y-3 pb-32">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-xl overflow-hidden shadow-sm"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-base text-gray-900">
                {category.name}
              </span>
              {expandedCategories.includes(category.id) ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Category Content (Expanded) */}
            {expandedCategories.includes(category.id) && (
              <div className="px-4 pb-4 border-t border-gray-100">
                {!category.document ? (
                  // Upload Area
                  <div className="pt-4">
                    <label
                      htmlFor={`upload-${category.id}`}
                      className={`block w-full p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                        isUploading === category.id
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        {isUploading === category.id ? (
                          <Loader2 className="w-8 h-8 text-orange-400 mb-3 animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400 mb-3" />
                        )}
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {isUploading === category.id
                            ? 'Uploading...'
                            : 'Upload property document'}
                        </p>
                        <p className="text-xs text-gray-500">
                          2MB Max &bull; jpeg, png, svg, pdf
                        </p>
                      </div>
                      <input
                        id={`upload-${category.id}`}
                        type="file"
                        className="hidden"
                        accept=".jpeg,.jpg,.png,.svg,.pdf"
                        disabled={isUploading !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(category.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    <button
                      disabled
                      className="mt-3 px-6 py-2 bg-white border-2 border-gray-300 rounded-xl font-medium text-gray-400 cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  // Uploaded Document
                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {category.document.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(category.document.size)} &bull; Uploaded{' '}
                          {formatRelativeTime(category.document.uploadedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <button
                        onClick={() =>
                          handleViewDocument(category.document!.url)
                        }
                        className="w-10 h-10 flex items-center justify-center"
                        title="View document"
                        aria-label="View document"
                      >
                        <Eye className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteDocument(category.document!.id)
                        }
                        className="w-10 h-10 flex items-center justify-center"
                        title="Delete document"
                        aria-label="Delete document"
                      >
                        <X className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200 z-10">
        <button
          onClick={handleContinue}
          disabled={!hasUploadedDocs || isSubmitting || isUploading !== null}
          className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
