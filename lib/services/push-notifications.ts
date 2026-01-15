const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('VAPID keys not configured. Push notifications will not work.')
}

// Initialize web-push (only on server-side)
let webpush: any = null
if (typeof window === 'undefined' && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush = require('web-push')
    webpush.setVapidDetails(
      'mailto:support@reachapp.com', // Change to your support email
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    )
  } catch (error) {
    console.warn('web-push not available:', error)
  }
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushMessage {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  tag?: string
  requireInteraction?: boolean
}

/**
 * Send push notification to a user's device
 * This should be called from the server-side
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  message: PushMessage
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured, skipping push notification')
    return
  }

  try {
    if (!webpush) {
      throw new Error('web-push not initialized. VAPID keys may be missing.')
    }

    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      icon: message.icon || '/icons/icon-192x192.png',
      badge: message.badge || '/icons/icon-192x192.png',
      data: message.data,
      tag: message.tag,
      requireInteraction: message.requireInteraction || false,
    })

    await webpush.sendNotification(subscription, payload)
  } catch (error) {
    console.error('Failed to send push notification:', error)
    throw error
  }
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID_PUBLIC_KEY is not configured')
  }
  return VAPID_PUBLIC_KEY
}

