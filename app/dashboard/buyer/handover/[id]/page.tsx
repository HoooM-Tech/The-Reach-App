'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { buyerApi, ApiError } from '@/lib/api/client';
import { 
  Building2, 
  FileText,
  CheckCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  MapPin
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function BuyerHandoverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const handoverId = params?.id as string;
  
  const [handover, setHandover] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !handoverId) {
      router.push('/dashboard/buyer');
      return;
    }

    const fetchHandover = async () => {
      setIsLoading(true);
      try {
        const dashboard = await buyerApi.getDashboard(user.id);
        const foundHandover = [
          ...(dashboard.handovers?.pending || []),
          ...(dashboard.handovers?.completed || []),
        ].find((h: any) => h.id === handoverId);
        
        if (foundHandover) {
          setHandover(foundHandover);
        } else {
          setError('Handover not found');
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load handover';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHandover();
  }, [user?.id, handoverId, router]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'Pending', color: 'bg-orange-100 text-orange-700', icon: <Clock size={16} /> },
      documents_submitted: { label: 'Documents Submitted', color: 'bg-blue-100 text-blue-700', icon: <FileText size={16} /> },
      payment_confirmed: { label: 'Payment Confirmed', color: 'bg-purple-100 text-purple-700', icon: <CheckCircle size={16} /> },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={16} /> },
    };
    return statusConfig[status?.toLowerCase()] || { label: status, color: 'bg-gray-100 text-gray-700', icon: <FileText size={16} /> };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !handover) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Handover not found</h3>
            <p className="text-gray-600 mb-4">{error || 'This handover may have been removed or is no longer available.'}</p>
            <button
              onClick={() => router.push('/dashboard/buyer')}
              className="px-6 py-3 bg-[#E54D4D] text-white rounded-xl font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusBadge(handover.status);

  return (
    <div className="p-6 pb-24 lg:pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Handover Details</h1>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#E54D4D]/10 rounded-xl flex items-center justify-center">
              <Building2 className="text-[#E54D4D]" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {handover.properties?.title || 'Property'}
              </h2>
              {handover.properties?.location && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin size={14} />
                  <span>
                    {handover.properties.location.city}, {handover.properties.location.state}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Handover Steps */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Handover Process</h3>
          <div className="space-y-4">
            {[
              { step: 1, label: 'Documents Submitted', key: 'documents_submitted' },
              { step: 2, label: 'Payment Confirmed', key: 'payment_confirmed' },
              { step: 3, label: 'Handover Completed', key: 'completed' },
            ].map(({ step, label, key }) => {
              const isCompleted = handover.status === key || 
                (key === 'completed' && handover.status === 'completed') ||
                (key === 'documents_submitted' && ['documents_submitted', 'payment_confirmed', 'completed'].includes(handover.status)) ||
                (key === 'payment_confirmed' && ['payment_confirmed', 'completed'].includes(handover.status));
              
              return (
                <div key={step} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle size={16} /> : <span>{step}</span>}
                  </div>
                  <span className={isCompleted ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Created Date */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
          <p>Handover initiated: {new Date(handover.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

