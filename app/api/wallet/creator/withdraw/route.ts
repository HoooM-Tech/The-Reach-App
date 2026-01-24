/**
 * POST /api/wallet/creator/withdraw
 * 
 * Creator withdrawal endpoint (alias for /api/wallet/withdraw)
 * This route is available for creators (withdrawals only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

// Import the handler from withdraw route
async function withdrawHandler(req: NextRequest) {
  // This will be handled by the withdraw route which works for all authenticated users
  const { POST } = await import('../../withdraw/route');
  return POST(req);
}

export { withdrawHandler as POST };
