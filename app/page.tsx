'use client';

import Landing from '../components/Landing';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  // Always show landing page first - no auto-redirect
  return <Landing />;
}

