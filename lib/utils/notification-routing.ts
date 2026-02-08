/**
 * Notification Routing Resolver
 * 
 * Type-safe routing for notifications based on notification type and user role.
 * Ensures creators never navigate to public property pages unless explicitly required.
 */

export interface NotificationData {
  property_id?: string;
  property_title?: string;
  lead_id?: string;
  inspection_id?: string;
  contract_id?: string;
  transaction_id?: string;
  escrow_id?: string;
  handover_id?: string;
  amount?: number;
  buyer_id?: string;
  buyer_name?: string;
  buyer_phone?: string;
  developer_id?: string;
  creator_id?: string;
  promotion_id?: string;
  slot_time?: string;
  old_slot_time?: string;
  [key: string]: any;
}

export interface Notification {
  type: string;
  data?: NotificationData;
}

/**
 * Resolve notification route based on type and user role
 * 
 * @param notification - Notification object with type and data
 * @param userRole - User role ('creator' | 'buyer' | 'developer' | 'admin')
 * @returns Route string or null if no navigation should occur
 */
export function resolveNotificationRoute(
  notification: Notification,
  userRole?: string
): string | null {
  if (!notification.data) {
    return null;
  }

  const { type, data } = notification;

  // ===========================================
  // CREATOR ROUTES
  // ===========================================
  if (userRole === 'creator') {
    // Lead notifications → Analytics page
    // This is the main notification creators receive when leads are generated
    if (type === 'new_lead' || type === 'lead_created') {
      // If promotion_id exists, route to specific promotion analytics
      if (data.promotion_id) {
        return `/dashboard/creator/my-promotions/${data.promotion_id}`;
      }
      // Otherwise route to general analytics
      return '/dashboard/creator/analytics';
    }

    // Commission/payout notifications → Wallet page
    // Creators receive 'payout_processed' when they earn commission
    if (type === 'payout_processed' || type === 'commission_earned' || type === 'commission_paid') {
      // If transaction_id exists, route to specific transaction
      if (data.transaction_id) {
        return `/dashboard/creator/wallet/transactions/${data.transaction_id}`;
      }
      // Otherwise route to wallet transactions list
      return '/dashboard/creator/wallet/transactions';
    }

    // Withdrawal processed → Wallet transactions
    if (type === 'withdrawal_processed') {
      if (data.transaction_id) {
        return `/dashboard/creator/wallet/transactions/${data.transaction_id}`;
      }
      return '/dashboard/creator/wallet/transactions';
    }

    // Property assigned → Creator promotions page (if promotion_id exists)
    if (type === 'property_assigned' && data.promotion_id) {
      return `/dashboard/creator/my-promotions/${data.promotion_id}`;
    }

    // Promotion paused/resumed → Analytics page
    if (type === 'promotion_paused' || type === 'promotion_resumed') {
      if (data.promotion_id) {
        return `/dashboard/creator/my-promotions/${data.promotion_id}`;
      }
      return '/dashboard/creator/analytics';
    }

    // Tier updated → Profile page
    if (type === 'tier_updated' || type === 'tier_upgraded') {
      return '/dashboard/creator/profile';
    }

    // System notifications → No navigation (read-only)
    if (type === 'system' || type === 'system_announcement') {
      return null;
    }

    // CRITICAL: Never route creators to public property pages
    // Even if property_id exists in notification data, creators should not
    // be routed to /property/:id unless explicitly required
    // Default: No navigation for creators (prevent accidental routing to public pages)
    return null;
  }

  // ===========================================
  // DEVELOPER ROUTES
  // ===========================================
  if (userRole === 'developer') {
    // Handover notifications → Developer handover page
    if (
      type === 'handover_documents_signed' ||
      type === 'handover_completed'
    ) {
      if (data.handover_id) {
        return `/dashboard/developer/handover/${data.handover_id}`;
      }
      return '/dashboard/developer/handover';
    }

    // Property verified → Developer property page
    if (type === 'property_verified' && data.property_id) {
      if (data.contract_id) {
        return `/dashboard/developer/contracts/${data.contract_id}`;
      }
      return `/dashboard/developer/properties/${data.property_id}`;
    }

    // New lead → Developer leads page
    if (type === 'new_lead' || type === 'lead_created') {
      return '/dashboard/developer/leads';
    }

    // New bid → Bid details or property page
    if (type === 'new_bid' && data.property_id) {
      if (data.bid_id) {
        return `/dashboard/developer/properties/${data.property_id}/bids/${data.bid_id}`;
      }
      return `/dashboard/developer/properties/${data.property_id}`;
    }

    // Inspection booked/rescheduled/cancelled → Developer inspections page
    if (type === 'inspection_booked' || type === 'inspection_rescheduled_by_buyer' || type === 'inspection_cancelled') {
      if (data.inspection_id) {
        return `/dashboard/developer/inspections/${data.inspection_id}`;
      }
      return '/dashboard/developer/inspections';
    }

    if (type === 'inspection_paid' && data.inspection_id) {
      return `/dashboard/developer/inspections/${data.inspection_id}`;
    }

    // Contract executed → Contracts page
    if (type === 'contract_executed' && data.contract_id) {
      return `/dashboard/developer/contracts/${data.contract_id}`;
    }

    // Property bought → Wallet with transaction
    if (type === 'property_bought' && data.transaction_id) {
      return `/dashboard/developer/wallet?transaction=${data.transaction_id}`;
    }

    // Deposit/payout → Wallet
    if (type === 'deposit_cash' || type === 'payout_processed') {
      return '/dashboard/developer/wallet';
    }

    // Default: No navigation
    return null;
  }

  // ===========================================
  // BUYER ROUTES
  // ===========================================
  if (userRole === 'buyer') {
    // Inspection updates → Buyer inspection details
    if (
      type === 'inspection_booked' ||
      type === 'inspection_confirmed' ||
      type === 'inspection_rescheduled' ||
      type === 'inspection_cancelled' ||
      type === 'inspection_completed' ||
      type === 'inspection_paid'
    ) {
      if (data.inspection_id) {
        return `/dashboard/buyer/inspections/${data.inspection_id}`;
      }
      return '/dashboard/buyer/inspections';
    }

    // Property updates → Public property page (buyers can view)
    if (type === 'property_verified' && data.property_id) {
      return `/property/${data.property_id}`;
    }

    // Handover notifications → Buyer handover pages
    if (type === 'handover_documents_uploaded') {
      if (data.handover_id) {
        return `/dashboard/buyer/handover/${data.handover_id}/documents`;
      }
      return '/dashboard/buyer/handover';
    }
    if (type === 'handover_scheduled' || type === 'handover_completed') {
      if (data.handover_id) {
        return `/dashboard/buyer/handover/${data.handover_id}`;
      }
      return '/dashboard/buyer/handover';
    }

    // Payment/transaction → Buyer wallet
    if (type === 'payment_confirmed' || type === 'deposit_cash') {
      return '/dashboard/buyer/wallet';
    }

    // Default: No navigation
    return null;
  }

  // ===========================================
  // FALLBACK (for backwards compatibility)
  // ===========================================
  // Only allow public property routes for buyers or unauthenticated users
  // Never route creators or developers to public property pages
  if (data.property_id && (userRole === 'buyer' || !userRole)) {
    return `/property/${data.property_id}`;
  }

  // Default: No navigation
  return null;
}

/**
 * Get action label for notification based on type
 * 
 * @param notification - Notification object
 * @param userRole - User role
 * @returns Action label string or null
 */
export function getNotificationActionLabel(
  notification: Notification,
  userRole?: string
): string | null {
  const { type } = notification;

  if (userRole === 'creator') {
    if (type === 'new_lead' || type === 'lead_created') {
      return 'View Analytics';
    }
    if (type === 'payout_processed' || type === 'commission_earned' || type === 'commission_paid') {
      return 'View Wallet';
    }
    if (type === 'withdrawal_processed') {
      return 'View Transaction';
    }
    if (type === 'tier_updated' || type === 'tier_upgraded') {
      return 'View Profile';
    }
    return null;
  }

  if (userRole === 'developer') {
    if (type === 'property_verified') {
      return 'View Contract';
    }
    if (type === 'new_bid') {
      return 'View Bid';
    }
    if (type === 'inspection_booked' || type === 'inspection_rescheduled_by_buyer' || type === 'inspection_cancelled') {
      return 'View Inspection';
    }
    if (type === 'inspection_paid') {
      return 'View Inspection';
    }
    if (type === 'property_bought' || type === 'deposit_cash' || type === 'payout_processed') {
      return 'See Transaction';
    }
    return null;
  }

  if (userRole === 'buyer') {
    if (
      type === 'inspection_booked' ||
      type === 'inspection_confirmed' ||
      type === 'inspection_rescheduled' ||
      type === 'inspection_cancelled' ||
      type === 'inspection_completed' ||
      type === 'inspection_paid'
    ) {
      return 'View Inspection';
    }
    if (type === 'payment_confirmed') {
      return 'View Transaction';
    }
    if (type === 'handover_documents_uploaded') {
      return 'View Documents';
    }
    if (type === 'handover_scheduled' || type === 'handover_completed') {
      return 'View Handover';
    }
    return null;
  }

  return null;
}
