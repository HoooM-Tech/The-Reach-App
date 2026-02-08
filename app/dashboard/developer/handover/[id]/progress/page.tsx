'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerHandoverApi } from '@/lib/api/client';
import { Clock, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HandoverProgressPage() {
  const router = useRouter();
  const params = useParams();
  const handoverId = params.id as string;
  const { user, isLoading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await developerHandoverApi.getHandover(handoverId);

      // If buyer has confirmed, redirect to complete page
      if (data.status === 'completed') {
        router.replace(`/dashboard/developer/handover/${handoverId}/complete`);
      }
    } catch (err) {
      console.error('Failed to check handover status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [handoverId, router]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    if (handoverId) checkStatus();
  }, [user, userLoading, router, handoverId, checkStatus]);

  // Poll for completion every 30 seconds
  useEffect(() => {
    if (!handoverId) return;
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [handoverId, checkStatus]);

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* Progress Icon */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-orange-50 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Handover in Progress
        </h1>
        <p className="text-gray-500 text-base sm:text-lg mb-12">
          Payout remains locked
        </p>

        {/* Action Button */}
        <button
          onClick={() => router.push('/dashboard/developer')}
          className="w-full max-w-sm mx-auto py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg hover:bg-[#1A3B5D]/90 transition-colors"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
