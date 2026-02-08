/**
 * Date Grouping Utility
 * Groups notifications by date (Yesterday, November 2025, October, etc.)
 */

import { parseTimestamp } from './time'

export interface DateGroup {
  label: string
  date: Date
  key: string
}

export function groupNotificationsByDate(notifications: Array<{ created_at: string }>): Map<string, typeof notifications> {
  const groups = new Map<string, typeof notifications>()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  notifications.forEach((notification) => {
    const notificationDate = parseTimestamp(notification.created_at)
    const notificationDateOnly = new Date(notificationDate.getFullYear(), notificationDate.getMonth(), notificationDate.getDate())
    
    let groupKey: string
    let groupLabel: string

    if (notificationDateOnly.getTime() === today.getTime()) {
      groupKey = 'today'
      groupLabel = 'Today'
    } else if (notificationDateOnly.getTime() === yesterday.getTime()) {
      groupKey = 'yesterday'
      groupLabel = 'Yesterday'
    } else {
      // Group by month and year
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      const month = monthNames[notificationDate.getMonth()]
      const year = notificationDate.getFullYear()
      const currentYear = now.getFullYear()
      
      if (year === currentYear) {
        groupKey = `${month}_${year}`
        groupLabel = month
      } else {
        groupKey = `${month}_${year}`
        groupLabel = `${month} ${year}`
      }
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(notification)
  })

  return groups
}

export function getDateGroupLabel(key: string): string {
  if (key === 'today') return 'Today'
  if (key === 'yesterday') return 'Yesterday'
  
  // Parse month_year format
  const parts = key.split('_')
  if (parts.length === 2) {
    const month = parts[0]
    const year = parts[1]
    const currentYear = new Date().getFullYear()
    
    if (year === currentYear.toString()) {
      return month
    } else {
      return `${month} ${year}`
    }
  }
  
  return key
}

export function sortDateGroups(groups: Map<string, any[]>): Array<{ key: string; label: string; notifications: any[] }> {
  const sorted: Array<{ key: string; label: string; notifications: any[] }> = []
  
  // Define order: today, yesterday, then by date (newest first)
  const order = ['today', 'yesterday']
  
  // Add today and yesterday first if they exist
  order.forEach((key) => {
    if (groups.has(key)) {
      sorted.push({
        key,
        label: getDateGroupLabel(key),
        notifications: groups.get(key)!,
      })
    }
  })
  
  // Add remaining groups sorted by date (newest first)
  const remainingGroups = Array.from(groups.entries())
    .filter(([key]) => !order.includes(key))
    .sort(([keyA], [keyB]) => {
      // Parse dates from keys (month_year format)
      const parseDate = (key: string): Date => {
        const parts = key.split('_')
        if (parts.length === 2) {
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ]
          const monthIndex = monthNames.indexOf(parts[0])
          const year = parseInt(parts[1])
          if (monthIndex !== -1 && !isNaN(year)) {
            return new Date(year, monthIndex, 1)
          }
        }
        return new Date(0) // Fallback
      }
      
      return parseDate(keyB).getTime() - parseDate(keyA).getTime()
    })
  
  remainingGroups.forEach(([key, notifications]) => {
    sorted.push({
      key,
      label: getDateGroupLabel(key),
      notifications,
    })
  })
  
  return sorted
}
