import crypto from 'crypto';

/**
 * Generate unique transaction reference
 * Format: TXN_{TYPE}_{timestamp}_{random}
 * @param type - Transaction type (deposit, withdrawal)
 * @returns Unique transaction reference
 */
export function generateTransactionReference(
  type: 'deposit' | 'withdrawal'
): string {
  const prefix = type === 'deposit' ? 'TXN_DEP' : 'TXN_WTH';
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Validate transaction reference format
 * @param reference - Reference to validate
 * @returns True if valid format
 */
export function isValidTransactionReference(reference: string): boolean {
  return /^TXN_(DEP|WTH)_\d+_[A-F0-9]{8}$/.test(reference);
}
