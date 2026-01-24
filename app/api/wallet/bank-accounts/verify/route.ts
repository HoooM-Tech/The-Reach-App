import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import { verifyBankAccount } from '@/lib/services/paystack';

/**
 * POST /api/wallet/bank-accounts/verify
 * 
 * Verify bank account with Paystack
 */
export async function POST(req: NextRequest) {
  try {
    await getAuthenticatedUser();
    const { accountNumber, bankCode } = await req.json();

    if (!accountNumber || !bankCode) {
      throw new ValidationError('Account number and bank code are required');
    }

    if (accountNumber.length !== 10 || !/^\d+$/.test(accountNumber)) {
      throw new ValidationError('Account number must be 10 digits');
    }

    // Verify account with Paystack
    const verification = await verifyBankAccount(accountNumber, bankCode);

    if (!verification.status || !verification.data?.account_name) {
      throw new ValidationError('Failed to verify bank account. Please check the details.');
    }

    return NextResponse.json({
      success: true,
      data: {
        accountName: verification.data.account_name,
        accountNumber: verification.data.account_number,
        bankCode: bankCode,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
