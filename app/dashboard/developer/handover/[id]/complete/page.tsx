'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HandoverCompletePage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* Success Icon */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <Check className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Handover completed
        </h1>
        <p className="text-gray-500 text-base sm:text-lg mb-12">
          Your payout is being processed.
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
