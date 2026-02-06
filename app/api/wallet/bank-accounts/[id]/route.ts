import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';

/**
 * DELETE /api/wallet/bank-accounts/[id]
 * 
 * Delete a bank account
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: bankAccountId } = await Promise.resolve(params);
    const supabase = createAdminSupabaseClient();

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') {
      throw walletError;
    }

    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    // Verify bank account belongs to user's wallet
    const { data: bankAccount, error: accountError } = await supabase
      .from('bank_accounts')
      .select('id, is_primary')
      .eq('id', bankAccountId)
      .eq('wallet_id', wallet.id)
      .maybeSingle();

    if (accountError) throw accountError;
    if (!bankAccount) {
      throw new NotFoundError('Bank account');
    }

    // Delete bank account
    const { error: deleteError } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', bankAccountId)
      .eq('wallet_id', wallet.id);

    if (deleteError) throw deleteError;

    // If deleted account was primary, set another as primary
    if (bankAccount.is_primary) {
      const { data: otherAccounts } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('wallet_id', wallet.id)
        .limit(1)
        .maybeSingle();

      if (otherAccounts) {
        await supabase
          .from('bank_accounts')
          .update({ is_primary: true })
          .eq('id', otherAccounts.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account removed successfully',
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
