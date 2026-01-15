/**
 * Normalizes phone numbers to international format
 * Converts common formats to +[country code][number] format
 * Handles Nigerian numbers (starting with 0) and other international formats
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.trim().replace(/[^\d+]/g, '')
  
  // If it starts with +, validate and return
  if (cleaned.startsWith('+')) {
    // Remove + for processing
    const withoutPlus = cleaned.substring(1)
    // If first digit after + is 0, it's invalid - try to fix Nigerian numbers
    if (withoutPlus.startsWith('0')) {
      // Convert +0... to +234...
      return '+234' + withoutPlus.substring(1)
    }
    return cleaned
  }
  
  // Handle Nigerian numbers (common case: starts with 0)
  // Convert 080... to +23480...
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return '+234' + cleaned.substring(1)
  }
  
  // If starts with 234 (Nigerian country code without +), add +
  if (cleaned.startsWith('234') && cleaned.length >= 13) {
    return '+' + cleaned
  }
  
  // If it's a valid number starting with 1-9 and has reasonable length, add +
  if (/^[1-9]\d{9,14}$/.test(cleaned)) {
    return '+' + cleaned
  }
  
  // Return cleaned number (will be validated by regex)
  return cleaned
}

/**
 * Validates phone number format
 * Accepts international format: +[country code][number]
 * First digit after + must be 1-9, followed by 1-14 digits
 */
export function validatePhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(normalized)
}

