'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { developerHandoverApi, ApiError } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ConfirmHandoverPage() {
  const router = useRouter();
  const params = useParams();
  const handoverId = params.id as string;
  const { user, isLoading: userLoading } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [handover, setHandover] = useState<any>(null);

  const fetchHandover = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await developerHandoverApi.getHandover(handoverId);
      setHandover(data);

      // If already confirmed by developer, redirect
      if (data.status === 'awaiting_buyer_confirmation') {
        router.replace(`/dashboard/developer/handover/${handoverId}/progress`);
      } else if (data.status === 'completed') {
        router.replace(`/dashboard/developer/handover/${handoverId}/complete`);
      }
    } catch (err) {
      console.error('Failed to fetch handover:', err);
    } finally {
      setIsLoading(false);
    }
  }, [handoverId, router]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
      return;
    }
    if (handoverId) fetchHandover();
  }, [user, userLoading, router, handoverId, fetchHandover]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await developerHandoverApi.confirmHandover(handoverId);
      router.push(`/dashboard/developer/handover/${handoverId}/progress`);
    } catch (err) {
      console.error('Confirm failed:', err);
      alert(err instanceof ApiError ? err.message : 'Failed to confirm handover');
    } finally {
      setIsConfirming(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      {/* Progress Indicator */}
      <div className="px-4 py-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Step 3</p>
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 bg-orange-500 rounded-full" />
          <div className="flex-1 h-1.5 bg-orange-500 rounded-full" />
          <div className="flex-1 h-1.5 bg-orange-500 rounded-full" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-2 pb-32">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Confirm Property handover
          </h2>
          <p className="text-gray-600 mb-8 text-sm">
            This is to formally state that the developer has completed delivery
          </p>

          {/* Quote Box */}
          <div className="bg-gray-100 rounded-xl p-6">
            <p className="text-gray-700 italic leading-relaxed">
              &ldquo; I upload proof, deliver keys, confirm handover. Once the buyer confirms, i get paid.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-200 z-10">
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg disabled:opacity-50"
        >
          {isConfirming ? 'Confirming...' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}
