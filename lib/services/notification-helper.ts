/**
 * Centralized Notification Helper Service
 * Provides consistent notification creation across the application
 */

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client'
import { sendNotification, type NotificationPayload } from './notifications'

export interface NotificationMetadata {
  property_id?: string
  property_title?: string
  lead_id?: string
  inspection_id?: string
  contract_id?: string
  transaction_id?: string
  escrow_id?: string
  handover_id?: string
  amount?: number
  buyer_id?: string
  buyer_name?: string
  buyer_phone?: string
  developer_id?: string
  creator_id?: string
  [key: string]: any
}

/**
 * Create a notification in the database
 * This is the main function to use for creating notifications
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: NotificationMetadata,
  channels: ('in_app' | 'email' | 'sms' | 'push')[] = ['in_app']
): Promise<void> {
  try {
    const payload: NotificationPayload = {
      user_id: userId,
      type,
      title,
      body: message,
      data: metadata,
      channels,
    }

    await sendNotification(payload)
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error)
    // Don't throw - notifications shouldn't break main flows
  }
}

/**
 * Notification templates for common events
 */
export const notificationHelpers = {
  /**
   * New lead notification
   */
  async newLead(data: {
    developerId: string
    creatorId?: string
    propertyId: string
    propertyTitle: string
    buyerName: string
    buyerPhone: string
    buyerEmail?: string
    leadId: string
  }): Promise<void> {
    // Notify developer
    await createNotification(
      data.developerId,
      'new_lead',
      'New Lead',
      `You just got a new Lead`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        lead_id: data.leadId,
        buyer_name: data.buyerName,
        buyer_phone: data.buyerPhone,
        buyer_email: data.buyerEmail,
      },
      ['in_app', 'push']
    )

    // Notify creator if applicable
    if (data.creatorId) {
      await createNotification(
        data.creatorId,
        'new_lead',
        'Lead Generated',
        `A lead was generated from your tracking link for "${data.propertyTitle}"`,
        {
          property_id: data.propertyId,
          property_title: data.propertyTitle,
          lead_id: data.leadId,
        },
        ['in_app', 'push']
      )
    }
  },

  /**
   * Inspection booked notification
   */
  async inspectionBooked(data: {
    developerId: string
    buyerId?: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    slotTime: string
    buyerName?: string
    buyerPhone?: string
  }): Promise<void> {
    // Use central time utility for consistent formatting
    const { formatInspectionTime } = await import('@/lib/utils/time')
    const formattedDateTime = formatInspectionTime(data.slotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
    })
    const [formattedDate, formattedTime] = formattedDateTime.split(' at ')

    // Notify developer
    await createNotification(
      data.developerId,
      'inspection_booked',
      'Inspection Booked',
      `You just got a new Lead`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        slot_time: data.slotTime,
        buyer_name: data.buyerName,
        buyer_phone: data.buyerPhone,
      },
      ['in_app', 'push']
    )

    // Notify buyer if provided
    if (data.buyerId) {
      await createNotification(
        data.buyerId,
        'inspection_booked',
        'Inspection Booked',
        `Your inspection for "${data.propertyTitle}" is scheduled for ${formattedDate} at ${formattedTime}.`,
        {
          property_id: data.propertyId,
          property_title: data.propertyTitle,
          inspection_id: data.inspectionId,
          slot_time: data.slotTime,
        },
        ['in_app', 'push', 'email']
      )
    }
  },

  /**
   * Contract executed/ready notification
   */
  async contractExecuted(data: {
    developerId: string
    buyerId?: string
    propertyId: string
    propertyTitle: string
    contractId: string
  }): Promise<void> {
    // Notify developer
    await createNotification(
      data.developerId,
      'contract_executed',
      'Contract Executed',
      `You just got a new Lead`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        contract_id: data.contractId,
      },
      ['in_app', 'push', 'email']
    )

    // Notify buyer if provided
    if (data.buyerId) {
      await createNotification(
        data.buyerId,
        'contract_executed',
        'Contract Executed',
        `The contract for "${data.propertyTitle}" has been executed.`,
        {
          property_id: data.propertyId,
          property_title: data.propertyTitle,
          contract_id: data.contractId,
        },
        ['in_app', 'push', 'email']
      )
    }
  },

  /**
   * Property verified notification
   */
  async propertyVerified(data: {
    developerId: string
    propertyId: string
    propertyTitle: string
  }): Promise<void> {
    await createNotification(
      data.developerId,
      'property_verified',
      'Verified Property',
      `Your property has been successfully verified. Please review and sign the contract of sale to activate your listing.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Property rejected notification
   */
  async propertyRejected(data: {
    developerId: string
    propertyId: string
    propertyTitle: string
    reason?: string
  }): Promise<void> {
    await createNotification(
      data.developerId,
      'property_rejected',
      'Property Rejected',
      `Your property "${data.propertyTitle}" has been rejected. ${data.reason ? `Reason: ${data.reason}` : 'Please review and resubmit.'}`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        reason: data.reason,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Property bought/sold notification
   */
  async propertyBought(data: {
    developerId: string
    buyerId?: string
    propertyId: string
    propertyTitle: string
    transactionId?: string
    amount?: number
  }): Promise<void> {
    // Notify developer
    await createNotification(
      data.developerId,
      'property_bought',
      'Bought Property',
      `Your property has been successfully sold out. Thank you for your patronage.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        transaction_id: data.transactionId,
        amount: data.amount,
      },
      ['in_app', 'push', 'email']
    )

    // Notify buyer if provided
    if (data.buyerId) {
      await createNotification(
        data.buyerId,
        'property_bought',
        'Property Purchase Confirmed',
        `Your purchase of "${data.propertyTitle}" has been confirmed.`,
        {
          property_id: data.propertyId,
          property_title: data.propertyTitle,
          transaction_id: data.transactionId,
          amount: data.amount,
        },
        ['in_app', 'push', 'email']
      )
    }
  },

  /**
   * Payment/deposit notification
   */
  async depositCash(data: {
    userId: string
    amount: number
    transactionId?: string
    propertyId?: string
    propertyTitle?: string
  }): Promise<void> {
    await createNotification(
      data.userId,
      'deposit_cash',
      'Deposit Cash',
      `You deposited ₦${data.amount.toLocaleString()}`,
      {
        amount: data.amount,
        transaction_id: data.transactionId,
        property_id: data.propertyId,
        property_title: data.propertyTitle,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Payout processed notification
   */
  async payoutProcessed(data: {
    userId: string
    amount: number
    transactionId?: string
    propertyId?: string
  }): Promise<void> {
    await createNotification(
      data.userId,
      'payout_processed',
      'Payout Processed',
      `Your payout of ₦${data.amount.toLocaleString()} has been processed.`,
      {
        amount: data.amount,
        transaction_id: data.transactionId,
        property_id: data.propertyId,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection rescheduled notification
   */
  async inspectionRescheduled(data: {
    developerId: string
    buyerId?: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    oldSlotTime: string
    newSlotTime: string
    buyerName?: string
    buyerPhone?: string
  }): Promise<void> {
    // Use central time utility for consistent formatting
    const { formatInspectionTime } = await import('@/lib/utils/time')
    const oldTimeFormatted = formatInspectionTime(data.oldSlotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
    })
    const newTimeFormatted = formatInspectionTime(data.newSlotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
    })

    // Notify buyer if provided
    if (data.buyerId) {
      await createNotification(
        data.buyerId,
        'inspection_rescheduled',
        'Inspection Rescheduled',
        `Your inspection for "${data.propertyTitle}" has been rescheduled from ${oldTimeFormatted} to ${newTimeFormatted}.`,
        {
          property_id: data.propertyId,
          property_title: data.propertyTitle,
          inspection_id: data.inspectionId,
          old_slot_time: data.oldSlotTime,
          slot_time: data.newSlotTime,
        },
        ['in_app', 'push', 'email']
      );
    }
  },

  /**
   * Payment confirmed notification
   */
  async paymentConfirmed(data: {
    buyerId: string
    developerId: string
    creatorId?: string
    propertyId: string
    propertyTitle: string
    amount: number
    transactionId: string
    escrowId: string
  }): Promise<void> {
    // Notify buyer
    await createNotification(
      data.buyerId,
      'payment_confirmed',
      'Payment Confirmed',
      `Payment of ₦${data.amount.toLocaleString()} confirmed. Your property is secured. Handover in progress.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        amount: data.amount,
        transaction_id: data.transactionId,
        escrow_id: data.escrowId,
      },
      ['in_app', 'push', 'email', 'sms']
    )

    // Notify developer
    await createNotification(
      data.developerId,
      'payment_confirmed',
      'Payment Received',
      `Payment of ₦${data.amount.toLocaleString()} received for "${data.propertyTitle}".`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        amount: data.amount,
        transaction_id: data.transactionId,
        escrow_id: data.escrowId,
      },
      ['in_app', 'push', 'email']
    )

    // Notify creator if applicable
    if (data.creatorId) {
      const creatorAmount = data.amount * 0.15 // 15% commission
      await createNotification(
        data.creatorId,
        'payout_processed',
        'Commission Earned',
        `You earned ₦${creatorAmount.toLocaleString()} commission from the sale of "${data.propertyTitle}".`,
        {
          property_id: data.propertyId,
          property_title: data.propertyTitle,
          amount: creatorAmount,
          transaction_id: data.transactionId,
        },
        ['in_app', 'push', 'email']
      )
    }
  },
}
