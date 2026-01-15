'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Redirect from /properties/[id] to /property/[id]
 * The main property detail page is at /property/[id]
 */
export default function PropertyDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;

  useEffect(() => {
    if (propertyId) {
      router.replace(`/property/${propertyId}`);
    } else {
      router.replace('/properties');
    }
  }, [propertyId, router]);

  return (
    <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#0A1628]/20 border-t-[#0A1628] animate-spin" />
        <p className="text-[#0A1628] font-medium">Loading property...</p>
      </div>
    </div>
  );
}
