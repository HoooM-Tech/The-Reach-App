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
        throw new Error('Failed to load properties');
      }

      const data = await response.json();
      
      // Only update state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setProperties(data.properties || []);
      }
    } catch (err) {
      // Don't set error if request was aborted
      if (abortController.signal.aborted) return;
      
      const message = err instanceof ApiError ? err.message : 'Failed to load properties';
      setError(message);
      console.error('Failed to load admin queue:', err);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Role check is handled by layout/middleware
    loadProperties();
    
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
    return (
      <div className="min-h-screen bg-reach-light p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load properties</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadProperties}
              className="inline-flex items-center gap-2 px-4 py-2 bg-reach-navy text-white rounded-lg"
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

