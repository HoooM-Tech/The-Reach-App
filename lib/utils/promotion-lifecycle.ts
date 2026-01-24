/**
 * Promotion Lifecycle Utilities
 * 
 * Centralized functions for checking and managing promotion states
 */

import { createAdminSupabaseClient } from '@/lib/supabase/client';

export type PromotionStatus = 'active' | 'paused' | 'stopped' | 'expired';

export interface PromotionState {
  id: string;
  status: PromotionStatus;
  expires_at: string | null;
}

/**
 * Check if a promotion is active (not paused, stopped, or expired)
 */
export function isPromotionActive(status: PromotionStatus, expiresAt: string | null): boolean {
  if (status !== 'active') {
    return false;
  }
  
  if (expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    return expires >= now;
  }
  
  return true;
}

/**
 * Auto-expire a promotion if it has passed its expiration date
 * Returns the updated status
 */
export async function checkAndExpirePromotion(
  promotionId: string,
  currentStatus: PromotionStatus,
  expiresAt: string | null
): Promise<PromotionStatus> {
  if (currentStatus !== 'active' || !expiresAt) {
    return currentStatus;
  }

  const now = new Date();
  const expires = new Date(expiresAt);

  if (expires < now) {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('tracking_links')
      .update({
        status: 'expired',
        expired_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', promotionId);

    if (!error) {
      console.log('[Promotion Lifecycle] Auto-expired', {
        promotion_id: promotionId,
        timestamp: now.toISOString(),
        action: 'auto-expire',
      });
      return 'expired';
    }
  }

  return currentStatus;
}

/**
 * Batch check and expire promotions (for scheduled jobs)
 */
export async function batchExpirePromotions(): Promise<number> {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  // Find all active promotions that have expired
  const { data: expiredPromotions, error } = await supabase
    .from('tracking_links')
    .select('id, creator_id, expires_at')
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', now);

  if (error || !expiredPromotions || expiredPromotions.length === 0) {
    return 0;
  }

  // Update all expired promotions
  const { error: updateError } = await supabase
    .from('tracking_links')
    .update({
      status: 'expired',
      expired_at: now,
      updated_at: now,
    })
    .in('id', expiredPromotions.map(p => p.id));

  if (updateError) {
    console.error('[Promotion Lifecycle] Batch expire error:', updateError);
    return 0;
  }

  // Log each expiration
  expiredPromotions.forEach(promo => {
    console.log('[Promotion Lifecycle] Auto-expired', {
      promotion_id: promo.id,
      creator_id: promo.creator_id,
      timestamp: now,
      action: 'auto-expire',
    });
  });

  return expiredPromotions.length;
}
