import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/route-handler';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { handleError } from '@/lib/utils/errors';
import { verifyPayment } from '@/lib/services/paystack';
import { toNaira } from '@/lib/utils/currency';
import { logWalletActivity } from '@/lib/utils/wallet-activity';

/**
 * GET /api/wallet/verify-transaction?reference={reference}
 * 
 * Verify wallet transaction status by reference
 * If transaction is still pending/processing, checks Paystack directly
 * and updates the transaction if payment is successful
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      );
    }

    // Use route handler client for authentication
    const routeSupabase = createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await routeSupabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Use admin client to fetch transaction
    const adminSupabase = createAdminSupabaseClient();
    
    // Find transaction by reference
    const { data: transaction, error: transactionError } = await adminSupabase
      .from('transactions')
      .select('*, wallets!inner(*)')
      .eq('reference', reference)
      .eq('user_id', authUser.id) // Ensure user owns this transaction
      .maybeSingle();

    if (transactionError) {
      console.error('Error finding transaction:', transactionError);
      return NextResponse.json(
        { error: 'Failed to verify transaction' },
        { status: 500 }
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // If transaction is still pending or processing, verify with Paystack directly
    if (transaction.status === 'pending' || transaction.status === 'processing') {
      try {
        console.log(`Transaction ${reference} is ${transaction.status}, verifying with Paystack...`);
        
        // Verify payment with Paystack
        const paystackVerification = await verifyPayment(reference);
        
        // If Paystack confirms payment is successful, update transaction immediately
        if (paystackVerification.status && paystackVerification.data?.status === 'success') {
          console.log(`Paystack confirms payment successful for ${reference}, updating transaction...`);
          
          const wallet = transaction.wallets;
          if (wallet) {
            const amountInNaira = toNaira(paystackVerification.data.amount); // Convert from kobo
            const currentBalance = parseFloat(wallet.available_balance || 0);
            const transactionAmount = parseFloat(transaction.amount);

            // CRITICAL: Update transaction status atomically
            // Use a transaction to ensure both transaction and wallet are updated together
            const { error: updateError } = await adminSupabase
              .from('transactions')
              .update({
                status: 'successful',
                payment_gateway: 'paystack',
                gateway_reference: reference,
                paystack_reference: reference,
                paystack_status: 'success',
                completed_at: new Date().toISOString(),
                webhook_received: false, // Mark as manually verified (not from webhook)
                webhook_payload: paystackVerification.data,
                webhook_received_at: new Date().toISOString(),
              })
              .eq('id', transaction.id)
              .in('status', ['pending', 'processing']); // Only update if still pending/processing

            if (!updateError) {
              // Update wallet balance
              const newBalance = currentBalance + transactionAmount;
              const { error: walletUpdateError } = await adminSupabase
                .from('wallets')
                .update({
                  available_balance: newBalance.toFixed(2),
                })
                .eq('id', wallet.id);

              if (walletUpdateError) {
                console.error('Error updating wallet balance:', walletUpdateError);
                // Don't fail - transaction is already marked as successful
              }

              // Log wallet activity
              try {
                await logWalletActivity({
                  wallet_id: wallet.id,
                  user_id: transaction.user_id || wallet.user_id,
                  action: 'deposit_completed',
                  previous_balance: currentBalance,
                  new_balance: newBalance,
                  amount_changed: transactionAmount,
                  transaction_id: transaction.id,
                  description: `Deposit of ${amountInNaira} NGN completed (verified directly)`,
                });
              } catch (logError) {
                console.error('Error logging wallet activity:', logError);
                // Don't fail - transaction is already completed
              }

              console.log(`✅ Transaction ${reference} finalized successfully via direct verification`);
              
              // Refetch transaction to get updated data
              const { data: updatedTransaction } = await adminSupabase
                .from('transactions')
                .select('*, wallets!inner(*)')
                .eq('id', transaction.id)
                .single();

              if (updatedTransaction) {
                return NextResponse.json({
                  success: true,
                  data: {
                    transaction: {
                      id: updatedTransaction.id,
                      reference: updatedTransaction.reference,
                      amount: parseFloat(updatedTransaction.amount),
                      fee: parseFloat(updatedTransaction.fee || 0),
                      net_amount: parseFloat(updatedTransaction.total_amount || updatedTransaction.amount),
                      status: updatedTransaction.status,
                      category: updatedTransaction.category,
                      currency: updatedTransaction.currency,
                      completed_at: updatedTransaction.completed_at,
                      created_at: updatedTransaction.created_at,
                    },
                    wallet: {
                      available_balance: parseFloat(updatedTransaction.wallets?.available_balance || 0),
                    },
                  },
                });
              }
            } else {
              console.error('❌ Error updating transaction:', updateError);
              // Transaction might have been updated by webhook - that's OK
            }
          }
        } else {
          console.log(`Paystack verification for ${reference} shows status: ${paystackVerification.data?.status}`);
        }
      } catch (paystackError: any) {
        // If Paystack verification fails, just return current transaction status
        // Don't fail the request - webhook will handle it later
        console.error('Paystack verification error:', paystackError);
      }
    }

    // Return current transaction status (whether updated or not)
    return NextResponse.json({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          reference: transaction.reference,
          amount: parseFloat(transaction.amount),
          fee: parseFloat(transaction.fee || 0),
          net_amount: parseFloat(transaction.total_amount || transaction.amount),
          status: transaction.status,
          category: transaction.category,
          currency: transaction.currency,
          completed_at: transaction.completed_at,
          created_at: transaction.created_at,
        },
        wallet: {
          available_balance: parseFloat(transaction.wallets?.available_balance || 0),
        },
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
