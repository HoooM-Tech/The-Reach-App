'use client';

import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useEffect, useState, useCallback } from 'react';
import { developerHandoverApi } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function WaitForBuyerPage() {
  const router = useRouter();
  const params = useParams();
  const handoverId = params.id as string;
  const { user, isLoading: userLoading } = useUser();
  const [handover, setHandover] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHandover = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await developerHandoverApi.getHandover(handoverId);
      setHandover(data);

      // If buyer has already signed, redirect to schedule page
      if (data.documentsSigned || data.status === 'buyer_signed' || data.status === 'documents_signed') {
        router.replace(`/dashboard/developer/handover/${handoverId}/schedule`);
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
    if (handoverId) {
      fetchHandover();
    }
  }, [user, userLoading, router, handoverId, fetchHandover]);

  // Poll for buyer signing status every 30 seconds
  useEffect(() => {
    if (!handoverId) return;
    const interval = setInterval(fetchHandover, 30000);
    return () => clearInterval(interval);
  }, [handoverId, fetchHandover]);

  const handleOkay = () => {
    router.push('/dashboard/developer');
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Warning Icon */}
        <div className="w-20 h-20 mx-auto mb-6">
          <svg viewBox="0 0 80 80" className="w-full h-full">
            <polygon
              points="40,4 76,24 76,56 40,76 4,56 4,24"
              fill="#F59E0B"
            />
            <text
              x="40"
              y="50"
              textAnchor="middle"
              fill="white"
              fontSize="36"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              !
            </text>
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          Wait for buyer&apos;s consent
        </h1>

        <div className="bg-gray-100 rounded-xl p-6 mb-8">
          <p className="text-gray-600 leading-relaxed text-left">
            Buyers must sign and scan through all documents provided by developers before handover will proceed.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleOkay}
          className="w-full py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg hover:bg-[#1A3B5D]/90 transition-colors"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
