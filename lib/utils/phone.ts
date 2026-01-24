/**
 * Nigerian Phone Number Normalization & Validation
 * 
 * Centralized utility for handling Nigerian phone numbers.
 * All phone numbers are normalized to E.164 format (+234XXXXXXXXXX) before storage.
 */

/**
 * Normalizes Nigerian phone numbers to E.164 format
 * 
 * Accepts:
 * - 0XXXXXXXXXX (local format)
 * - +234XXXXXXXXXX (international format)
 * 
 * Returns: +234XXXXXXXXXX (E.164 format)
 * 
 * @throws Error if phone number is invalid
 */
export function normalizeNigerianPhone(phone: string): string {
  // Remove all whitespace
  const value = phone.trim().replace(/\s+/g, '');

  // Already in E.164 format (+234XXXXXXXXXX)
  if (/^\+234\d{10}$/.test(value)) {
    return value;
  }

  // Local format (0XXXXXXXXXX) - convert to E.164
  if (/^0\d{10}$/.test(value)) {
    return `+234${value.slice(1)}`;
  }

  // Handle numbers that start with 234 but missing +
  if (/^234\d{10}$/.test(value)) {
    return `+${value}`;
  }

  // Invalid format
  throw new Error('Invalid Nigerian phone number. Must be 11 digits starting with 0 or +234 followed by 10 digits.');
}

/**
 * Validates if a phone number is a valid Nigerian number
 * 
 * Accepts both local (0XXXXXXXXXX) and international (+234XXXXXXXXXX) formats
 * 
 * @returns true if valid, false otherwise
 */
export function validateNigerianPhone(phone: string): boolean {
  try {
    normalizeNigerianPhone(phone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use normalizeNigerianPhone instead
 */
export function normalizePhoneNumber(phone: string): string {
  try {
    return normalizeNigerianPhone(phone);
  } catch (error) {
    // Fallback for non-Nigerian numbers (if needed for other countries)
    // For now, we only support Nigerian numbers
    throw error;
  }
}

/**
 * Legacy validation function for backward compatibility
 * @deprecated Use validateNigerianPhone instead
 */
export function validatePhoneNumber(phone: string): boolean {
  return validateNigerianPhone(phone);
}
