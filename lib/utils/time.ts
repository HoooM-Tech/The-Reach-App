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
 */

/**
 * Convert a local date/time string to UTC ISO string for storage
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format (24-hour, local time)
 * @returns ISO 8601 UTC string ready for database storage
 * 
 * Example:
 *   localToUTC('2024-01-15', '12:20') -> '2024-01-15T12:20:00.000Z' (if UTC+0)
 *   localToUTC('2024-01-15', '00:20') -> '2024-01-15T00:20:00.000Z' (midnight, not previous day)
 */
export function localToUTC(dateString: string, timeString: string): string {
  if (!dateString || !timeString) {
    throw new Error('Date and time strings are required');
  }

  // Parse date components
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);

  // Validate inputs
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
    throw new Error('Invalid date or time format');
  }

  // Create Date object in LOCAL timezone (this is the key - no timezone specified)
  // JavaScript Date constructor interprets this as local time
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // Validate the date was created correctly
  if (
    localDate.getFullYear() !== year ||
    localDate.getMonth() !== month - 1 ||
    localDate.getDate() !== day ||
    localDate.getHours() !== hours ||
    localDate.getMinutes() !== minutes
  ) {
    throw new Error('Invalid date/time values');
  }

  // Convert to UTC ISO string for storage
  return localDate.toISOString();
}

/**
 * Convert UTC ISO string to local date string (YYYY-MM-DD)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Date string in YYYY-MM-DD format (local timezone)
 */
export function utcToLocalDate(utcISOString: string): string {
  if (!utcISOString) {
    throw new Error('UTC ISO string is required');
  }

  const date = new Date(utcISOString);
  
  // Validate date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid UTC ISO string');
  }

  // Get local date components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Convert UTC ISO string to local time string (HH:MM)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Time string in HH:MM format (24-hour, local timezone)
 */
export function utcToLocalTime(utcISOString: string): string {
  if (!utcISOString) {
    throw new Error('UTC ISO string is required');
  }

  const date = new Date(utcISOString);
  
  // Validate date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid UTC ISO string');
  }

  // Get local time components
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Format UTC ISO string for display with date and time
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @param options - Formatting options
 * @returns Formatted date/time string
 */
export function formatInspectionTime(
  utcISOString: string,
  options: {
    includeDate?: boolean;
    includeTime?: boolean;
    timeFormat?: '12h' | '24h';
  } = {}
): string {
  if (!utcISOString) {
    return '';
  }

  const {
    includeDate = true,
    includeTime = true,
    timeFormat = '12h',
  } = options;

  const date = new Date(utcISOString);
  
  // Validate date
  if (isNaN(date.getTime())) {
    return '';
  }

  const parts: string[] = [];

  if (includeDate) {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    parts.push(dateStr);
  }

  if (includeTime) {
    let timeStr: string;
    if (timeFormat === '12h') {
      timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else {
      timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    parts.push(timeStr);
  }

  return parts.join(' at ');
}

/**
 * Format UTC ISO string for display (time only, 12-hour format)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Formatted time string (e.g., "12:20 AM" or "11:20 AM")
 */
export function formatInspectionTimeOnly(utcISOString: string): string {
  if (!utcISOString) {
    return '';
  }

  const date = new Date(utcISOString);
  
  // Validate date
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format UTC ISO string for display (date only)
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Formatted date string
 */
export function formatInspectionDate(utcISOString: string): string {
  if (!utcISOString) {
    return '';
  }

  const date = new Date(utcISOString);
  
  // Validate date
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Get day of week from UTC ISO string
 * 
 * @param utcISOString - ISO 8601 UTC string from database
 * @returns Day of week (e.g., "Monday")
 */
export function getDayOfWeek(utcISOString: string): string {
  if (!utcISOString) {
    return '';
  }

  const date = new Date(utcISOString);
  
  // Validate date
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Validate that a UTC ISO string represents a valid inspection time
 * 
 * @param utcISOString - ISO 8601 UTC string to validate
 * @returns true if valid, false otherwise
 */
export function isValidInspectionTime(utcISOString: string): boolean {
  if (!utcISOString) {
    return false;
  }

  const date = new Date(utcISOString);
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
  const date1 = new Date(utcISOString1);
  const date2 = new Date(utcISOString2);
  
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
    return false;
  }
  
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
  const date1 = new Date(utcISOString1);
  const date2 = new Date(utcISOString2);
  
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
    return false;
  }
  
  return date1.getTime() > date2.getTime();
}
