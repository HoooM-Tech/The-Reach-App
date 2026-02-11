import crypto from 'crypto';

/**
 * Generate unique transaction reference for Paystack
 * CRITICAL: Paystack requires globally unique references per transaction
 * Format: reach_{UUID}
 * @param type - Transaction type (deposit, withdrawal) - kept for logging but not used in reference
 * @returns Globally unique transaction reference
 */
export function generateTransactionReference(
  type: 'deposit' | 'withdrawal' | 'property_purchase'
): string {
  // Use crypto.randomUUID() for globally unique references
  // This ensures Paystack never sees duplicate references
  const uuid = crypto.randomUUID();
  return `reach_${uuid}`;
}

/**
 * Validate transaction reference format
 * @param reference - Reference to validate
 * @returns True if valid format
 */
export function isValidTransactionReference(reference: string): boolean {
  // Updated to match new UUID-based format
  return /^reach_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference);
}
