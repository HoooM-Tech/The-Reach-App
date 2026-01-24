import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, ValidationError } from '@/lib/utils/errors';
import { verifyBankAccount, createTransferRecipient } from '@/lib/services/paystack';

/**
 * GET /api/wallet/bank-accounts
 * 
 * Get all bank accounts for the user's wallet
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
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
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get bank accounts
    const { data: bankAccounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (accountsError) throw accountsError;

    return NextResponse.json({
      success: true,
      data: bankAccounts || [],
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

/**
 * POST /api/wallet/bank-accounts
 * 
 * Add a new bank account
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { bankName, accountNumber, bankCode } = await req.json();

    if (!bankName || !accountNumber || !bankCode) {
      throw new ValidationError('Bank name, account number, and bank code are required');
    }

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
      throw new ValidationError('Wallet not found. Please set up your wallet first.');
    }

    // Check account limit (max 3)
    const { count, error: countError } = await supabase
      .from('bank_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('wallet_id', wallet.id);

    if (countError) throw countError;

    if (count && count >= 3) {
      throw new ValidationError('Maximum of 3 bank accounts allowed');
    }

    // Verify account with Paystack
    let accountName: string;
    try {
      const verification = await verifyBankAccount(accountNumber, bankCode);
      if (!verification.status || !verification.data?.account_name) {
        throw new ValidationError('Failed to verify bank account. Please check the details.');
      }
      accountName = verification.data.account_name;
    } catch (error: any) {
      throw new ValidationError(
        error.message || 'Failed to verify bank account. Please check the details.'
      );
    }

    // Create transfer recipient in Paystack
    let recipientCode: string | null = null;
    try {
      const recipient = await createTransferRecipient(
        accountNumber,
        bankCode,
        accountName
      );
      if (recipient.status && recipient.data?.recipient_code) {
        recipientCode = recipient.data.recipient_code;
      }
    } catch (error) {
      console.error('Failed to create Paystack recipient:', error);
      // Continue without recipient code - can be created later during withdrawal
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('wallet_id', wallet.id)
      .eq('account_number', accountNumber)
      .maybeSingle();

    if (existingAccount) {
      throw new ValidationError('This bank account is already added');
    }

    // Set as primary if it's the first account
    const isPrimary = count === 0;

    // Insert bank account
    const { data: bankAccount, error: insertError } = await supabase
      .from('bank_accounts')
      .insert({
        wallet_id: wallet.id,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        bank_code: bankCode,
        recipient_code: recipientCode,
        is_verified: true,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      data: {
        id: bankAccount.id,
        account_number: bankAccount.account_number,
        account_name: bankAccount.account_name,
        bank_name: bankAccount.bank_name,
        bank_code: bankAccount.bank_code,
        is_verified: bankAccount.is_verified,
        is_default: bankAccount.is_primary,
      },
      verified: true,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
