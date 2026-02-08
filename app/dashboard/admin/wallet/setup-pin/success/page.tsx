'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

export default function AdminSetupSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto mb-8">
          <Check className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10 sm:mb-12">
          You&apos;re all set!
        </h1>
        <button
          onClick={() => router.push('/dashboard/admin/wallet')}
          className="w-full max-w-sm mx-auto py-4 bg-[#1E3A5F] text-white rounded-full font-semibold text-lg hover:bg-[#1E3A5F]/90 transition-colors"
        >
          Let&apos;s go
        </button>
      </div>
    </div>
  );
}
