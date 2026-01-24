/**
 * POST /api/wallet/developer/deposit
 * 
 * Developer deposit endpoint (alias for /api/wallet/add-funds)
 * This route enforces developer-only access
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireDeveloper } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

// Import the handler from add-funds route
async function depositHandler(req: NextRequest) {
  // This will be handled by the add-funds route which already checks for developer
  const { POST } = await import('../../add-funds/route');
  return POST(req);
}

export { depositHandler as POST };
