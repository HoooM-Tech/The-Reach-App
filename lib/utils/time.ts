/**
 * CENTRAL TIME UTILITY - SINGLE SOURCE OF TRUTH
 * 
 * CRITICAL RULE: All inspection times are stored in UTC and converted to local time ONLY at render time.
 * 
 * This utility enforces:
 * - UTC storage (database, API transport)
 * - Local display (UI only)
 * - No implicit conversions
 * - No manual hour adjustments
 * - Consistent AM/PM handling
 * 
 * For server-side formatting (e.g. notification bodies), pass timeZone: 'Africa/Lagos' so times
 * display correctly for Nigerian users regardless of server timezone.
 */

/** Default display timezone for server-side formatting (Nigeria) */
export const DISPLAY_TIMEZONE = 'Africa/Lagos'

/**
 * Parse a timestamp from the database. Ensures correct interpretation:
 * - ISO strings with Z or offset are parsed as UTC
 * - Strings without timezone (e.g. from Postgres) are treated as UTC
 */
export function parseTimestamp(value: string): Date {
  if (!value) return new Date(NaN)
  let str = String(value).trim()
  if (!str) return new Date(NaN)
  const hasTimezone = str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str)
  if (!hasTimezone) {
    if (str.includes(' ')) {
      str = str.replace(' ', 'T') + 'Z'
    } else if (str.includes('T')) {
      str = str + 'Z'
    } else {
      str = str + 'T00:00:00.000Z'
    }
  }
  return new Date(str)
}

/**
 * Convert a local date/time string (in user's timezone) to UTC ISO string for storage
 *
 * CRITICAL: The input time is interpreted as Africa/Lagos (Nigeria, UTC+1), not server timezone.
 * This ensures "9:15 AM" selected by a user in Nigeria is stored as 8:15 UTC, not 9:15 UTC.
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format (24-hour, user's local time in Lagos)
 * @returns ISO 8601 UTC string ready for database storage
 *
 * Example (Africa/Lagos UTC+1):
 *   localToUTC('2024-01-15', '09:15') -> '2024-01-15T08:15:00.000Z' (9:15 AM Lagos = 8:15 UTC)
 */
export function localToUTC(dateString: string, timeString: string): string {
  if (!dateString || !timeString) {
    throw new Error('Date and time strings are required');
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid date or time format');
  }

  // Interpret the time as Africa/Lagos (UTC+1) - append +01:00 so JS parses correctly
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoWithOffset = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+01:00`;
  const date = new Date(isoWithOffset);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date/time values');
  }

  return date.toISOString();
}

/**
 * Convert UTC ISO string to local date string (YYYY-MM-DD)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Date string in YYYY-MM-DD format (local timezone)
 */
export function utcToLocalDate(utcISOString: string, timeZone?: string): string {
  if (!utcISOString) throw new Error('UTC ISO string is required');
  const date = parseTimestamp(utcISOString);
  if (isNaN(date.getTime())) throw new Error('Invalid UTC ISO string');
  const parts = new Intl.DateTimeFormat('en-CA', {
    ...(timeZone && { timeZone }),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value ?? '';
  const m = parts.find(p => p.type === 'month')?.value ?? '';
  const d = parts.find(p => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}

/**
 * Convert UTC ISO string to local time string (HH:MM)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Time string in HH:MM format (24-hour, local timezone)
 */
export function utcToLocalTime(utcISOString: string, timeZone?: string): string {
  if (!utcISOString) throw new Error('UTC ISO string is required');
  const date = parseTimestamp(utcISOString);
  if (isNaN(date.getTime())) throw new Error('Invalid UTC ISO string');
  const parts = new Intl.DateTimeFormat('en-GB', {
    ...(timeZone && { timeZone }),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const h = parts.find(p => p.type === 'hour')?.value ?? '09';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${h}:${m}`;
}

/**
 * Format UTC ISO string for display with date and time
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @param options - Formatting options. Pass timeZone for server-side (e.g. notifications) to ensure
 *   correct display regardless of server timezone. Omit for client-side to use user's local timezone.
 * @returns Formatted date/time string
 */
export function formatInspectionTime(
  utcISOString: string,
  options: {
    includeDate?: boolean;
    includeTime?: boolean;
    timeFormat?: '12h' | '24h';
    timeZone?: string;
  } = {}
): string {
  if (!utcISOString) {
    return '';
  }

  const {
    includeDate = true,
    includeTime = true,
    timeFormat = '12h',
    timeZone,
  } = options;

  // CRITICAL: Use parseTimestamp so DB values without 'Z' are always treated as UTC
  const date = parseTimestamp(utcISOString);

  if (isNaN(date.getTime())) {
    return '';
  }

  // Use Intl with timeZone - NO manual offset. DB stores UTC; Intl converts for display.
  const locale = 'en-US'
  const tz = timeZone || undefined
  const dateOpts: Intl.DateTimeFormatOptions = {
    ...(tz && { timeZone: tz }),
    month: 'long' as const,
    day: 'numeric' as const,
    year: 'numeric' as const,
  }
  const timeOpts: Intl.DateTimeFormatOptions = {
    ...(tz && { timeZone: tz }),
    hour: 'numeric' as const,
    minute: '2-digit' as const,
    hour12: timeFormat === '12h',
  }

  const parts: string[] = []

  if (includeDate) {
    parts.push(new Intl.DateTimeFormat(locale, dateOpts).format(date))
  }

  if (includeTime) {
    parts.push(new Intl.DateTimeFormat(locale, timeOpts).format(date))
  }

  return parts.join(' at ')
}

/**
 * Format UTC ISO string for display (time only, 12-hour format)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @param timeZone - Optional timezone (e.g. 'Africa/Lagos') for server-side formatting
 * @returns Formatted time string (e.g., "12:20 AM" or "11:20 AM")
 */
export function formatInspectionTimeOnly(utcISOString: string, timeZone?: string): string {
  if (!utcISOString) return '';
  const date = parseTimestamp(utcISOString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    ...(timeZone && { timeZone }),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format UTC ISO string for display (date only)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @param timeZone - Optional timezone (e.g. 'Africa/Lagos') for server-side formatting
 * @returns Formatted date string
 */
export function formatInspectionDate(utcISOString: string, timeZone?: string): string {
  if (!utcISOString) return '';
  const date = parseTimestamp(utcISOString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    ...(timeZone && { timeZone }),
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Get day of week from UTC ISO string
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Day of week (e.g., "Monday")
 */
export function getDayOfWeek(utcISOString: string, timeZone?: string): string {
  if (!utcISOString) return '';
  const date = parseTimestamp(utcISOString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    ...(timeZone && { timeZone }),
    weekday: 'long',
  }).format(date);
}

/**
 * Validate that a UTC ISO string represents a valid inspection time
 * 
 * @param utcISOString - ISO 8601 UTC string to validate
 * @returns true if valid, false otherwise
 */
export function isValidInspectionTime(utcISOString: string): boolean {
  if (!utcISOString) return false;
  const date = parseTimestamp(utcISOString);
  return !isNaN(date.getTime());
}

/**
 * Compare two UTC ISO strings to check if first is before second
 * 
 * @param utcISOString1 - First UTC ISO string
 * @param utcISOString2 - Second UTC ISO string
 * @returns true if first is before second
 */
export function isBefore(utcISOString1: string, utcISOString2: string): boolean {
  const date1 = parseTimestamp(utcISOString1);
  const date2 = parseTimestamp(utcISOString2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
  return date1.getTime() < date2.getTime();
}

/**
 * Compare two UTC ISO strings to check if first is after second
 * 
 * @param utcISOString1 - First UTC ISO string
 * @param utcISOString2 - Second UTC ISO string
 * @returns true if first is after second
 */
export function isAfter(utcISOString1: string, utcISOString2: string): boolean {
  const date1 = parseTimestamp(utcISOString1);
  const date2 = parseTimestamp(utcISOString2);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
  return date1.getTime() > date2.getTime();
}
