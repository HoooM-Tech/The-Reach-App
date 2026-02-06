// app/auth/login/page.tsx
'use client'; 

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Redirect from /auth/login to /login
 * This maintains backward compatibility for any links or bookmarks
 */
export default function AuthLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve any query parameters (like redirect)
    const params = new URLSearchParams(searchParams.toString());
    const queryString = params.toString();
    const redirectUrl = queryString ? `/login?${queryString}` : '/login';
    
    router.replace(redirectUrl);
  }, [router, searchParams]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-[#FDFBFA] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#0A1628]/20 border-t-[#0A1628] animate-spin" />
        <p className="text-[#0A1628] font-medium">Redirecting to login...</p>
      </div>
    </div>
  );
}

