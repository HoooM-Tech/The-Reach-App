import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendSMS } from './termii'
import { sendPushNotification, type PushSubscription } from './push-notifications'

export interface NotificationPayload {
  user_id: string
  type: string
  title: string
  body: string
  data?: Record<string, any>
  channels?: ('email' | 'sms' | 'in_app' | 'push')[]
}

export async function sendNotification(payload: NotificationPayload) {
  const supabase = createServerSupabaseClient()
  const channels = payload.channels || ['in_app']

  // Create in-app notification
  if (channels.includes('in_app')) {
    await supabase.from('notifications').insert({
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      read: false,
    })
  }

  // Send SMS if requested
  if (channels.includes('sms')) {
    const { data: user } = await supabase
      .from('users')
      .select('phone')
      .eq('id', payload.user_id)
      .single()

    if (user?.phone) {
      try {
        await sendSMS(user.phone, `${payload.title}: ${payload.body}`)
      } catch (error) {
        console.error('Failed to send SMS notification:', error)
      }
    }
  }

  // Send push notification if requested
  if (channels.includes('push')) {
    try {
      // Get user's push subscription from database
      const { data: user } = await supabase
        .from('users')
        .select('push_subscription')
        .eq('id', payload.user_id)
        .single()

      if (user?.push_subscription) {
        const subscription = user.push_subscription as PushSubscription
        await sendPushNotification(subscription, {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          icon: '/icons/icon-192x192.png',
        })
      }
    } catch (error) {
      console.error('Failed to send push notification:', error)
    }
  }

  // TODO: Implement email notifications
}

export const notificationTemplates = {
  inspection_booked: (data: any) => ({
    title: 'Inspection Booked',
    body: `Your inspection for ${data.property_address} is scheduled for ${data.date} at ${data.time}.`,
  }),
  payment_confirmed: (data: any) => ({
    title: 'Payment Successful',
    body: `Payment of ₦${data.amount} confirmed. Your property is secured. Handover in progress.`,
  }),
  new_lead: (data: any) => ({
    title: 'New Lead Received',
    body: `You have a new lead for ${data.property_title}. Contact: ${data.buyer_phone}`,
  }),
  property_verified: (data: any) => ({
    title: 'Property Verified',
    body: `Your property "${data.property_title}" has been verified and is now live.`,
  }),
  handover_complete: (data: any) => ({
    title: 'Handover Complete',
    body: `Handover for ${data.property_address} has been completed. All documents are available in your vault.`,
  }),
}

