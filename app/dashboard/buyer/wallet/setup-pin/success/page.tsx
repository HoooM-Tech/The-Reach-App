'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function BuyerSetupSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <Check className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10 sm:mb-12">
          You&apos;re all set!
        </h1>
        <button
          onClick={() => router.push('/dashboard/buyer/wallet')}
          className="w-full max-w-sm mx-auto py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg hover:bg-[#1A3B5D]/90 transition-colors"
        >
          Let&apos;s go
        </button>
      </div>
    </div>
  );
}
