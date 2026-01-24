/**
 * Currency utilities for Nigerian Naira (NGN)
 * Handles conversion between Naira and Kobo (Paystack's smallest unit)
 */

/**
 * Convert Naira to Kobo (for Paystack API)
 * @param naira - Amount in Naira
 * @returns Amount in Kobo
 */
export function toKobo(naira: number): number {
  if (isNaN(naira) || !isFinite(naira)) {
    throw new Error('Invalid amount');
  }
  return Math.round(naira * 100);
}

/**
 * Convert Kobo to Naira (from Paystack API)
 * @param kobo - Amount in Kobo
 * @returns Amount in Naira
 */
export function toNaira(kobo: number): number {
  if (isNaN(kobo) || !isFinite(kobo)) {
    throw new Error('Invalid amount');
  }
  return kobo / 100;
}

/**
 * Format amount as Nigerian Naira currency
 * @param amount - Amount in Naira
 * @returns Formatted string (e.g., "₦50,000.00")
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount as simple Naira string
 * @param amount - Amount in Naira
 * @returns Formatted string (e.g., "₦50,000.00")
 */
export function formatNairaSimple(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Validate amount (check if valid number, positive, max 2 decimal places)
 * @param amount - Amount to validate
 * @param type - Transaction type for limit checking
 * @throws Error if validation fails
 */
export function validateAmount(
  amount: number,
  type: 'deposit' | 'withdrawal'
): void {
  // Check if amount is a valid number
  if (isNaN(amount) || !isFinite(amount)) {
    throw new Error('Invalid amount');
  }

  // Check for negative or zero
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Check decimal places (max 2 for Naira)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    throw new Error('Amount cannot have more than 2 decimal places');
  }

  // Check limits
  const LIMITS = {
    deposit: { min: 100, max: 10000000 }, // ₦100 to ₦10M
    withdrawal: { min: 1000, max: 5000000 }, // ₦1,000 to ₦5M
  };

  const limits = LIMITS[type];
  if (amount < limits.min) {
    throw new Error(
      `Minimum ${type} is ${formatNaira(limits.min)}`
    );
  }
  if (amount > limits.max) {
    throw new Error(
      `Maximum ${type} is ${formatNaira(limits.max)}`
    );
  }
}

/**
 * Calculate Paystack deposit fee
 * Paystack charges 1.5% capped at ₦2,000
 * @param amount - Amount in Naira
 * @returns Fee in Naira
 */
export function calculateDepositFee(amount: number): number {
  const fee = amount * 0.015; // 1.5%
  return Math.min(fee, 2000); // Cap at ₦2,000
}

/**
 * Calculate Paystack withdrawal fee
 * Paystack charges ₦50 + 0.5% (capped at ₦500 total)
 * @param amount - Amount in Naira
 * @returns Object with fee and netAmount
 */
export function calculateWithdrawalFee(amount: number): {
  fee: number;
  netAmount: number;
} {
  const percentageFee = amount * 0.005; // 0.5%
  const totalFee = 50 + percentageFee;
  const cappedFee = Math.min(totalFee, 550); // ₦50 + ₦500 cap
  const fee = Math.round(cappedFee * 100) / 100; // Round to 2 decimal places
  const netAmount = Math.round((amount - fee) * 100) / 100;
  return { fee, netAmount };
}
