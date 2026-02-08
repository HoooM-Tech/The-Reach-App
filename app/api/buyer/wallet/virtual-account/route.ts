import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireBuyer } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/buyer/wallet/virtual-account
 * Get dedicated virtual account for bank transfer (buyer only).
 * Returns placeholder when no DVA is provisioned (e.g. Paystack DVA not set up).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireBuyer();
    const supabase = createAdminSupabaseClient();

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, available_balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    // If your app stores virtual_account_number and virtual_account_bank on wallets, return them here.
    const virtualAccountNumber = (wallet as any)?.virtual_account_number;
    const virtualAccountBank = (wallet as any)?.virtual_account_bank;
    const virtualAccountName = (wallet as any)?.virtual_account_name;

    if (virtualAccountNumber && virtualAccountBank) {
      return NextResponse.json({
        success: true,
        account: {
          bankName: virtualAccountBank,
          accountNumber: virtualAccountNumber,
          accountName: virtualAccountName || user.full_name || user.email || 'Buyer',
          bankCode: (wallet as any)?.virtual_bank_code || '',
        },
      });
    }

    // No virtual account provisioned: return empty so frontend can show instructions or "use card instead"
    return NextResponse.json({
      success: true,
      account: null,
      message: 'Virtual account not yet assigned. Use Card Payment to add funds.',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
