/**
 * Build inspection notification message from data at render time.
 * Times are derived from slot_time in notification data - NO pre-formatted strings.
 * Use client-side only - formats using user's browser locale/timezone.
 */

import { formatInspectionTime } from './time'

export interface InspectionNotificationData {
  property_title?: string
  slot_time?: string
  old_slot_time?: string
  buyer_name?: string
  [key: string]: unknown
}

/**
 * Build the display message for inspection-related notifications.
 * Formats times from data at render time - single source of truth.
 * Omit timeZone to use user's browser locale (client-side).
 */
export function getInspectionNotificationMessage(
  type: string,
  data: InspectionNotificationData | undefined,
  fallbackBody: string
): string {
  if (!data?.property_title) return fallbackBody

  const title = data.property_title
  const formatTime = (iso: string) =>
    formatInspectionTime(iso, { includeDate: true, includeTime: true, timeFormat: '12h' })

  switch (type) {
    case 'inspection_booked':
      if (data.slot_time) {
        const formatted = formatTime(data.slot_time)
        return `Your inspection for "${title}" is scheduled for ${formatted}.`
      }
      break

    case 'inspection_rescheduled':
    case 'inspection_rescheduled_by_buyer':
      if (data.old_slot_time && data.slot_time) {
        const oldFormatted = formatTime(data.old_slot_time)
        const newFormatted = formatTime(data.slot_time)
        const prefix = type === 'inspection_rescheduled_by_buyer'
          ? `${data.buyer_name || 'A buyer'} rescheduled the inspection for `
          : 'Your inspection for '
        const suffix = type === 'inspection_rescheduled_by_buyer'
          ? ` from ${oldFormatted} to ${newFormatted}.`
          : ` has been rescheduled from ${oldFormatted} to ${newFormatted}.`
        return `${prefix}"${title}"${suffix}`
      }
      break

    case 'inspection_confirmed':
      if (data.slot_time) {
        const formatted = formatTime(data.slot_time)
        return `Your inspection for "${title}" has been confirmed for ${formatted}.`
      }
      break
  }

  return fallbackBody
}

/**
 * Check if notification type has inspection times to derive from data
 */
export function hasInspectionTimes(type: string): boolean {
  return [
    'inspection_booked',
    'inspection_rescheduled',
    'inspection_rescheduled_by_buyer',
    'inspection_confirmed',
  ].includes(type)
}
