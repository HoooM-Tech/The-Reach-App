import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireBuyer } from '@/lib/utils/auth';
import { handleError, NotFoundError } from '@/lib/utils/errors';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireBuyer();
    const { id: bankAccountId } = await Promise.resolve(params);
    const supabase = createAdminSupabaseClient();

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError && walletError.code !== 'PGRST116') throw walletError;
    if (!wallet) throw new NotFoundError('Wallet');

    const { data: bankAccount, error: accountError } = await supabase
      .from('bank_accounts')
      .select('id, is_primary')
      .eq('id', bankAccountId)
      .eq('wallet_id', wallet.id)
      .maybeSingle();

    if (accountError) throw accountError;
    if (!bankAccount) throw new NotFoundError('Bank account');

    const { error: deleteError } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', bankAccountId)
      .eq('wallet_id', wallet.id);

    if (deleteError) throw deleteError;

    if (bankAccount.is_primary) {
      const { data: other } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('wallet_id', wallet.id)
        .limit(1)
        .maybeSingle();

      if (other) {
        await supabase
          .from('bank_accounts')
          .update({ is_primary: true })
          .eq('id', other.id);
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
