'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function BuyerHandoverSignCompletePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* Success Icon */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <Check className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={3} />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Document signed &amp; Reviewed
        </h1>
        <p className="text-gray-500 text-base sm:text-lg mb-12">
          Your have successfully confirmed handover.
        </p>

        {/* Action Button */}
        <button
          onClick={() => router.push('/dashboard/buyer/handover')}
          className="w-full max-w-md py-4 bg-[#1A3B5D] text-white rounded-full font-semibold text-lg hover:bg-[#152e47] transition-colors"
        >
          Back to Handover
        </button>
      </div>
    </div>
  )
}
