'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export const dynamic = 'force-dynamic';

/**
 * Paystack Success Redirect Page
 * 
 * Paystack redirects here after payment with query params:
 * - trxref: Transaction reference
 * - reference: Transaction reference (same as trxref)
 * 
 * This page extracts the reference and redirects to the verify page
 */
export default function AddFundsSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (userLoading) {
      return; // Wait for auth check
    }

    if (!user) {
      // Not authenticated - redirect to login
      router.push('/login');
      return;
    }

    // Extract reference from query params
    // Paystack sends both trxref and reference (they're the same)
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      console.error('No reference found in Paystack redirect');
      // Redirect to wallet page if no reference
      router.push('/dashboard/developer/wallet');
      return;
    }

    // Redirect to verify page with the reference
    // The verify page will handle transaction verification and status display
    router.replace(`/dashboard/developer/wallet/verify?reference=${encodeURIComponent(reference)}`);
  }, [searchParams, router, user, userLoading]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-reach-navy border-t-transparent animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Processing payment...</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to verification...</p>
      </div>
    </div>
  );
}
