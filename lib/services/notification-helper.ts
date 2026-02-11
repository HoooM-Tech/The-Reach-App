/**
 * Centralized Notification Helper Service
 * Provides consistent notification creation across the application
 */

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
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
    // Use central time utility - pass timeZone for correct display (server runs in UTC)
    const { formatInspectionTime, DISPLAY_TIMEZONE } = await import('@/lib/utils/time')
    const formattedDateTime = formatInspectionTime(data.slotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
      timeZone: DISPLAY_TIMEZONE,
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
   * New bid notification
   */
  async newBid(data: {
    developerId: string
    propertyId: string
    propertyTitle: string
    bidId: string
    bidAmount: number
    bidNote?: string
    buyerId: string
    buyerName: string
  }): Promise<void> {
    const adminSupabase = createAdminSupabaseClient()
    const { data: developer } = await adminSupabase
      .from('users')
      .select('notification_preferences')
      .eq('id', data.developerId)
      .single()

    const preferences = (developer?.notification_preferences as any) || {}
    const wantsBidNotifications = preferences.newBids !== false
    const channels: ('in_app' | 'email' | 'sms' | 'push')[] = wantsBidNotifications
      ? ['in_app', 'push', 'email']
      : ['in_app']

    await createNotification(
      data.developerId,
      'new_bid',
      'New Bid Received',
      `${data.buyerName} submitted a bid of ₦${data.bidAmount.toLocaleString()} on ${data.propertyTitle}`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        bid_id: data.bidId,
        buyer_id: data.buyerId,
        buyer_name: data.buyerName,
        amount: data.bidAmount,
        bid_note: data.bidNote,
        action_url: `/dashboard/developer/properties/${data.propertyId}/bids/${data.bidId}`,
      },
      channels
    )
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
    // Use central time utility - pass timeZone for correct display (server runs in UTC)
    const { formatInspectionTime, DISPLAY_TIMEZONE } = await import('@/lib/utils/time')
    const oldTimeFormatted = formatInspectionTime(data.oldSlotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
      timeZone: DISPLAY_TIMEZONE,
    })
    const newTimeFormatted = formatInspectionTime(data.newSlotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
      timeZone: DISPLAY_TIMEZONE,
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
   * Inspection rescheduled by buyer notification (developer)
   */
  async inspectionRescheduledByBuyer(data: {
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
    const { formatInspectionTime, DISPLAY_TIMEZONE } = await import('@/lib/utils/time')
    const oldTimeFormatted = formatInspectionTime(data.oldSlotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
      timeZone: DISPLAY_TIMEZONE,
    })
    const newTimeFormatted = formatInspectionTime(data.newSlotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
      timeZone: DISPLAY_TIMEZONE,
    })

    await createNotification(
      data.developerId,
      'inspection_rescheduled_by_buyer',
      'Inspection rescheduled — confirmation required',
      `${data.buyerName || 'A buyer'} rescheduled the inspection for "${data.propertyTitle}" from ${oldTimeFormatted} to ${newTimeFormatted}. Please confirm the new time.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        old_slot_time: data.oldSlotTime,
        slot_time: data.newSlotTime,
        buyer_id: data.buyerId,
        buyer_name: data.buyerName,
        buyer_phone: data.buyerPhone,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection confirmed notification
   */
  async inspectionConfirmed(data: {
    buyerId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    slotTime: string
  }): Promise<void> {
    const { formatInspectionTime, DISPLAY_TIMEZONE } = await import('@/lib/utils/time')
    const formattedDateTime = formatInspectionTime(data.slotTime, {
      includeDate: true,
      includeTime: true,
      timeFormat: '12h',
      timeZone: DISPLAY_TIMEZONE,
    })
    await createNotification(
      data.buyerId,
      'inspection_confirmed',
      'Inspection Confirmed',
      `Your inspection for "${data.propertyTitle}" has been confirmed for ${formattedDateTime}.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        slot_time: data.slotTime,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection cancelled notification (generic - notifies buyer)
   */
  async inspectionCancelled(data: {
    buyerId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    reason?: string
  }): Promise<void> {
    await createNotification(
      data.buyerId,
      'inspection_cancelled',
      'Inspection Cancelled',
      data.reason
        ? `Your inspection for "${data.propertyTitle}" was cancelled: ${data.reason}`
        : `Your inspection for "${data.propertyTitle}" has been cancelled.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        cancellation_reason: data.reason,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection cancelled by buyer → notify developer
   */
  async inspectionCancelledByBuyer(data: {
    developerId: string
    buyerId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    buyerName?: string
  }): Promise<void> {
    await createNotification(
      data.developerId,
      'inspection_cancelled',
      'Inspection Cancelled',
      `${data.buyerName || 'A buyer'} cancelled their inspection for "${data.propertyTitle}".`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        buyer_id: data.buyerId,
        buyer_name: data.buyerName,
        cancelled_by: 'buyer',
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection cancelled by developer → notify buyer
   */
  async inspectionCancelledByDeveloper(data: {
    buyerId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
  }): Promise<void> {
    await createNotification(
      data.buyerId,
      'inspection_cancelled',
      'Inspection Cancelled',
      `The developer cancelled your inspection for "${data.propertyTitle}". You may rebook at a different time.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        cancelled_by: 'developer',
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection completed notification
   */
  async inspectionCompleted(data: {
    buyerId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
  }): Promise<void> {
    await createNotification(
      data.buyerId,
      'inspection_completed',
      'Inspection Completed',
      `Your inspection for "${data.propertyTitle}" has been completed.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection confirmed – notify admin
   */
  async inspectionConfirmedAdmin(data: {
    adminId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    slotTime?: string
    developerId?: string
    buyerId?: string
  }): Promise<void> {
    await createNotification(
      data.adminId,
      'inspection_confirmed_admin',
      'Inspection Confirmed',
      `A developer confirmed an inspection for "${data.propertyTitle}".`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        slot_time: data.slotTime,
        developer_id: data.developerId,
        buyer_id: data.buyerId,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection completed – notify admin
   */
  async inspectionCompletedAdmin(data: {
    adminId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    developerId?: string
    buyerId?: string
  }): Promise<void> {
    await createNotification(
      data.adminId,
      'inspection_completed_admin',
      'Inspection Completed',
      `An inspection for "${data.propertyTitle}" has been marked complete.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        developer_id: data.developerId,
        buyer_id: data.buyerId,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Property purchase completed (buyer + developer notifications).
   * Inspections are FREE; this is for PROPERTY PURCHASE only.
   */
  async inspectionPaymentCompleted(data: {
    buyerId: string
    developerId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
    amount: number
    transactionId: string
  }): Promise<void> {
    await createNotification(
      data.buyerId,
      'property_purchase_completed',
      'Property Purchase Completed',
      `Your property purchase of ₦${data.amount.toLocaleString()} for "${data.propertyTitle}" was successful. Handover in progress.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        amount: data.amount,
        transaction_id: data.transactionId,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Notify developer: property payment received, handover can begin.
   */
  async propertyPaymentReceivedDeveloper(data: {
    developerId: string
    propertyId: string
    propertyTitle: string
    amount: number
    handoverId?: string
  }): Promise<void> {
    await createNotification(
      data.developerId,
      'property_payment_received',
      'Property payment received. Handover can begin.',
      `A payment of ₦${data.amount.toLocaleString()} was received for "${data.propertyTitle}". You can now start the handover process.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        amount: data.amount,
        handover_id: data.handoverId,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Inspection interest withdrawn notification
   */
  async inspectionInterestWithdrawn(data: {
    developerId: string
    buyerId: string
    propertyId: string
    propertyTitle: string
    inspectionId: string
  }): Promise<void> {
    await createNotification(
      data.developerId,
      'inspection_interest_withdrawn',
      'Interest Withdrawn',
      `A buyer withdrew interest for "${data.propertyTitle}".`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        inspection_id: data.inspectionId,
        buyer_id: data.buyerId,
      },
      ['in_app', 'push', 'email']
    )
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

  // ===========================================
  // Handover Notifications
  // ===========================================

  /**
   * Handover documents uploaded notification (to buyer)
   */
  async handoverDocumentsUploaded(data: {
    buyerId: string
    propertyId: string
    propertyTitle: string
    handoverId: string
    documentsCount: number
  }): Promise<void> {
    await createNotification(
      data.buyerId,
      'handover_documents_uploaded',
      'Handover Documents Ready',
      `Documents for "${data.propertyTitle}" are ready for your review and signature.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        handover_id: data.handoverId,
        documents_count: data.documentsCount,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Handover documents uploaded notification (to admin)
   */
  async handoverDocumentsUploadedAdmin(data: {
    adminId: string
    developerId: string
    propertyId: string
    propertyTitle: string
    handoverId: string
    documentsCount: number
  }): Promise<void> {
    await createNotification(
      data.adminId,
      'handover_documents_uploaded_admin',
      'Handover Documents Uploaded',
      `Developer has uploaded handover documents for "${data.propertyTitle}".`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        handover_id: data.handoverId,
        developer_id: data.developerId,
        documents_count: data.documentsCount,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Handover documents signed notification (to developer)
   */
  async handoverDocumentsSigned(data: {
    developerId: string
    buyerId: string
    buyerName: string
    propertyId: string
    propertyTitle: string
    handoverId: string
  }): Promise<void> {
    await createNotification(
      data.developerId,
      'handover_documents_signed',
      'Documents Signed',
      `${data.buyerName} has reviewed and signed all handover documents for "${data.propertyTitle}".`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        handover_id: data.handoverId,
        buyer_id: data.buyerId,
        buyer_name: data.buyerName,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Handover documents signed notification (to admin)
   */
  async handoverDocumentsSignedAdmin(data: {
    adminId: string
    buyerId: string
    buyerName: string
    propertyId: string
    propertyTitle: string
    handoverId: string
  }): Promise<void> {
    await createNotification(
      data.adminId,
      'handover_documents_signed_admin',
      'Documents Signed - Schedule Handover',
      `Buyer has signed documents for "${data.propertyTitle}". Ready to schedule physical handover.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        handover_id: data.handoverId,
        buyer_id: data.buyerId,
        buyer_name: data.buyerName,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Physical handover scheduled notification (to buyer)
   */
  async handoverScheduled(data: {
    buyerId: string
    propertyId: string
    propertyTitle: string
    handoverId: string
    date: string
    time: string
    location: string
  }): Promise<void> {
    await createNotification(
      data.buyerId,
      'handover_scheduled',
      'Physical Handover Scheduled',
      `Your handover for "${data.propertyTitle}" is scheduled for ${data.date} at ${data.time}.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        handover_id: data.handoverId,
        handover_date: data.date,
        handover_time: data.time,
        handover_location: data.location,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Handover completed notification (to buyer)
   */
  async handoverCompleted(data: {
    buyerId: string
    propertyId: string
    propertyTitle: string
    handoverId: string
  }): Promise<void> {
    await createNotification(
      data.buyerId,
      'handover_completed',
      'Handover Complete',
      `Congratulations! The handover for "${data.propertyTitle}" has been completed. You are now the official owner.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        handover_id: data.handoverId,
      },
      ['in_app', 'push', 'email']
    )
  },

  /**
   * Handover completed notification (to admin)
   */
  async handoverCompletedAdmin(data: {
    adminId: string
    buyerId: string
    developerId: string
    propertyId: string
    propertyTitle: string
    handoverId: string
  }): Promise<void> {
    await createNotification(
      data.adminId,
      'handover_completed_admin',
      'Handover Completed',
      `Physical handover for "${data.propertyTitle}" has been successfully completed.`,
      {
        property_id: data.propertyId,
        property_title: data.propertyTitle,
        handover_id: data.handoverId,
        buyer_id: data.buyerId,
        developer_id: data.developerId,
      },
      ['in_app', 'push', 'email']
    )
  },
}
