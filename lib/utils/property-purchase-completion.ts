/**
 * Idempotent property purchase completion: escrow, handover, developer locked balance.
 * Call after transaction is marked successful (wallet or Paystack).
 * Safe to call multiple times (checks transaction status and existing handover).
 */

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { notificationHelpers } from '@/lib/services/notification-helper';
import { logWalletActivity } from '@/lib/utils/wallet-activity';

export interface CompletePropertyPurchaseParams {
  transactionId: string;
  amount: number;
  propertyId: string;
  developerId: string;
  buyerId: string;
  inspectionId: string;
  propertyTitle: string;
  reference?: string;
}

export async function completePropertyPurchase(
  params: CompletePropertyPurchaseParams
): Promise<{ escrowId?: string; handoverId?: string }> {
  const adminSupabase = createAdminSupabaseClient();
  const {
    transactionId,
    amount,
    propertyId,
    developerId,
    buyerId,
    inspectionId,
    propertyTitle,
    reference,
  } = params;

  const { data: transaction, error: txError } = await adminSupabase
    .from('transactions')
    .select('id, status')
    .eq('id', transactionId)
    .single();

  if (txError || !transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status === 'successful' || transaction.status === 'completed') {
    const { data: existing } = await adminSupabase
      .from('handovers')
      .select('id, transaction_id')
      .eq('property_id', propertyId)
      .eq('buyer_id', buyerId)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { handoverId: existing.id, escrowId: existing.transaction_id };
    }
  }

  const { data: property } = await adminSupabase
    .from('properties')
    .select('id, title, listing_type')
    .eq('id', propertyId)
    .single();

  const handoverType =
    property?.listing_type === 'sale'
      ? 'sale'
      : property?.listing_type === 'rent'
        ? 'long_term_rental'
        : 'short_term_rental';

  const splits = {
    developer_amount: amount,
    creator_amount: 0,
    reach_amount: 0,
  };

  const { data: escrow, error: escrowError } = await adminSupabase
    .from('escrow_transactions')
    .insert({
      property_id: propertyId,
      buyer_id: buyerId,
      developer_id: developerId,
      amount,
      splits,
      status: 'held',
      payment_reference: reference || transactionId,
    })
    .select('id')
    .single();

  if (escrowError) {
    if (escrowError.code === '23505') {
      const { data: existingEscrow } = await adminSupabase
        .from('escrow_transactions')
        .select('id')
        .eq('property_id', propertyId)
        .eq('buyer_id', buyerId)
        .eq('payment_reference', reference || transactionId)
        .maybeSingle();
      if (existingEscrow) {
        const { data: h } = await adminSupabase
          .from('handovers')
          .select('id')
          .eq('transaction_id', existingEscrow.id)
          .maybeSingle();
        return { escrowId: existingEscrow.id, handoverId: h?.id };
      }
    }
    throw new Error(escrowError.message);
  }

  const { data: handover, error: handoverError } = await adminSupabase
    .from('handovers')
    .insert({
      property_id: propertyId,
      transaction_id: escrow.id,
      developer_id: developerId,
      buyer_id: buyerId,
      type: handoverType,
      status: 'payment_confirmed',
      payment_confirmed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (handoverError) {
    if (handoverError.code === '23505') {
      const { data: existing } = await adminSupabase
        .from('handovers')
        .select('id, transaction_id')
        .eq('property_id', propertyId)
        .eq('buyer_id', buyerId)
        .maybeSingle();
      if (existing) return { escrowId: existing.transaction_id, handoverId: existing.id };
    }
    console.error('Handover creation error:', handoverError);
  }

  const { data: devWallet } = await adminSupabase
    .from('wallets')
    .select('id, user_id, locked_balance, available_balance')
    .eq('user_id', developerId)
    .maybeSingle();

  if (devWallet) {
    const prevLocked = parseFloat(devWallet.locked_balance || '0');
    const newLocked = prevLocked + amount;
    await adminSupabase
      .from('wallets')
      .update({ locked_balance: newLocked.toFixed(2) })
      .eq('id', devWallet.id);
    try {
      await logWalletActivity({
        wallet_id: devWallet.id,
        user_id: developerId,
        action: 'property_purchase',
        previous_balance: prevLocked,
        new_balance: newLocked,
        amount_changed: amount,
        transaction_id: transactionId,
        description: `Property purchase – ${propertyTitle} (locked until handover)`,
      });
    } catch (e) {
      console.error('Failed to log wallet activity:', e);
    }
  }

  await adminSupabase
    .from('properties')
    .update({ status: property?.listing_type === 'sale' ? 'sold' : 'rented' })
    .eq('id', propertyId);

  try {
    await notificationHelpers.inspectionPaymentCompleted({
      buyerId,
      developerId,
      propertyId,
      propertyTitle,
      inspectionId,
      amount,
      transactionId,
    });
    await notificationHelpers.propertyPaymentReceivedDeveloper({
      developerId,
      propertyId,
      propertyTitle,
      amount,
      handoverId: handover?.id,
    });
  } catch (e) {
    console.error('Failed to send notifications:', e);
  }

  return { escrowId: escrow.id, handoverId: handover?.id };
}
