/**
 * Client-side utility for managing push notifications
 * This should be used in React components
 */

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Convert VAPID public key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscriptionData | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Push notifications are not supported in this browser')
    return null
  }

  try {
    // Get VAPID public key from server
    const response = await fetch('/api/push/vapid-key')
    if (!response.ok) {
      throw new Error('Failed to get VAPID public key')
    }

    const { publicKey } = await response.json()
    if (!publicKey) {
      throw new Error('VAPID public key not available')
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push notifications
    const keyArray = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray.buffer as ArrayBuffer,
    })

    // Convert subscription to format we can store
    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(
          String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))
        ),
        auth: btoa(
          String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))
        ),
      },
    }

    // Send subscription to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionData),
    })

    return subscriptionData
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error)
    return false
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission()
  }

  return Notification.permission
}

