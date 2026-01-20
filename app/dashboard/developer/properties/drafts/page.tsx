'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerApi, ApiError } from '@/lib/api/client';
import { PropertyStatus, Property } from '@/types/property';
import type { Property as ApiProperty } from '@/types';
import { Bell, Menu, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface DraftProperty extends ApiProperty {
  lastSaved?: string;
}

export default function DraftsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [drafts, setDrafts] = useState<DraftProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadDrafts = useCallback(async () => {
    if (!user?.id) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);
      const response = await developerApi.getMyProperties();
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        // Filter for draft properties
        const draftProperties = (response.properties || []).filter(
          (p: any) => p.verification_status === 'draft' || p.status === 'draft'
        ).map((p: any) => ({
          ...p,
          lastSaved: p.updated_at || p.created_at,
        })) as DraftProperty[];
        setDrafts(draftProperties);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load drafts';
      setError(message);
      console.error('Failed to load drafts:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    // Role check is handled by layout/middleware
    loadDrafts();
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, userLoading, loadDrafts, router]);

  const handleDeleteDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      setDeletingId(draftId);
      // TODO: Implement delete API endpoint
      // await developerApi.deleteProperty(draftId);
      alert('Delete functionality will be implemented with API endpoint');
      // setDrafts(drafts.filter(d => d.id !== draftId));
    } catch (error: any) {
      const message = error instanceof ApiError ? error.message : 'Failed to delete draft';
      console.error('Failed to delete draft:', error);
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleContinueEditing = (draftId: string) => {
    router.push(`/dashboard/developer/properties/${draftId}/edit`);
  };

  const formatLastSaved = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        // Show time if saved today
        const hours = Math.floor(diffInHours);
        const minutes = Math.floor((diffInHours - hours) * 60);
        
        if (hours === 0) {
          return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
        }
        
        const dateObj = new Date(dateString);
        const isAM = dateObj.getHours() < 12;
        const hour12 = dateObj.getHours() % 12 || 12;
        const minutes12 = dateObj.getMinutes().toString().padStart(2, '0');
        return `${hour12}:${minutes12} ${isAM ? 'AM' : 'PM'}`;
      } else {
        // Show relative time for older dates
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) {
          return 'Yesterday';
        } else if (diffInDays < 7) {
          return `${diffInDays} days ago`;
        } else {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        }
      }
    } catch {
      return 'Unknown';
    }
  };

  if (userLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load drafts</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadDrafts}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A1628] text-white rounded-lg"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#FDFBFA]">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 bg-[#FDFBFA] px-6 py-4 flex items-center justify-between z-50 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Draft</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/notifications')}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Bell size={20} className="text-gray-700" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
              <Menu size={20} className="text-gray-700" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="pt-24 pb-8 px-6">
          {drafts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Menu size={48} className="text-gray-400" />
              </div>
              <p className="text-gray-500">No drafts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => {
                const mainImage = draft.media?.find((m: any) => (m.type === 'image' || m.type === 'IMAGE'))?.url || 'https://picsum.photos/600/400?random=' + draft.id;
                
                return (
                  <div
                    key={draft.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100"
                  >
                    {/* Property Image */}
                    <div className="relative w-full h-64">
                      <img
                        src={mainImage}
                        alt={draft.title || 'Untitled Property'}
                        className="w-full h-full object-cover"
                      />
                      {/* Delete Icon Overlay */}
                      <button
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        disabled={deletingId === draft.id}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={18} className="text-white" />
                      </button>
                    </div>

                    {/* Property Info */}
                    <div className="p-5">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {draft.title || 'Untitled Property'}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          Last saved: {draft.lastSaved ? formatLastSaved(draft.lastSaved) : 'Unknown'}
                        </p>
                      </div>
                      
                      {/* Continue Editing Button */}
                      <button
                        onClick={() => handleContinueEditing(draft.id)}
                        className="w-full py-3 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Continue editing
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}

