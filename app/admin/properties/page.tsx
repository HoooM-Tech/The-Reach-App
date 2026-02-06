'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { ApiError } from '@/lib/api/client';
import { PropertyTable } from '@/components/properties/PropertyTable';
import { Property } from '@/types/property';
import { Shield, RefreshCw, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminPropertiesPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadProperties = useCallback(async () => {
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
      
      // Use admin API endpoint
      const response = await fetch('/api/admin/properties/pending-verification', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to load properties';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) {
            console.error('[Admin Properties] API Error Details:', errorData.details);
          }
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Provide specific error messages based on status code
        if (response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Forbidden. You do not have admin permissions.';
        } else if (response.status === 404) {
          errorMessage = 'Properties endpoint not found.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setProperties(data.properties || []);
        console.log('[Admin Properties] Properties loaded:', data.properties?.length || 0);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof Error ? err.message : 'Failed to load properties';
      setError(message);
      console.error('[Admin Properties] Failed to load admin queue:', {
        error: err,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Auth check is handled by server-side layout
    // Only check if user context is ready and user exists
    if (!userLoading) {
      if (!user) {
        // This shouldn't happen due to layout protection, but handle gracefully
        router.push('/login?redirect=/admin/properties');
        return;
      }

      if (user.role !== 'admin') {
        // This shouldn't happen due to layout protection, but handle gracefully
        router.push(`/dashboard/${user.role || ''}`);
        return;
      }

      // User is authenticated and is admin - load properties
      loadProperties();
    }
    
    // Cleanup: abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, userLoading, loadProperties, router]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Determine error type for better UX
    const isAuthError = error.includes('Unauthorized') || error.includes('Forbidden');
    const isServerError = error.includes('Server error');
    
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-7xl mx-auto">
          <div className={`border rounded-2xl p-6 text-center ${
            isAuthError 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${
              isAuthError ? 'text-yellow-500' : 'text-red-500'
            }`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isAuthError ? 'Authentication Required' : 'Failed to load properties'}
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            {isAuthError ? (
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-reach-navy text-white rounded-lg hover:bg-reach-navy/90"
              >
                Go to Login
              </button>
            ) : (
              <button
                onClick={loadProperties}
                className="inline-flex items-center gap-2 px-4 py-2 bg-reach-navy text-white rounded-lg hover:bg-reach-navy/90"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-reach-light p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="text-reach-navy" size={28} />
          <h1 className="text-3xl font-bold text-gray-900">Admin Review Queue</h1>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-gray-400 text-lg">No properties pending review</p>
          </div>
        ) : (
          <PropertyTable properties={properties} />
        )}
      </div>
    </div>
  );
}

