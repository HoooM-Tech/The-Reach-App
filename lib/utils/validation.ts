import { z } from 'zod'

export const propertySchema = z.object({
  title: z.string().min(10).max(200),
  description: z.union([
    z.string().min(50).max(2000),
    z.literal(''),
  ]).optional().transform((val) => val === '' ? undefined : val),
  listing_type: z.enum(['sale', 'rent', 'lead_generation']),
  property_type: z.enum(['land', 'house', 'apartment', 'commercial']).optional(),
  asking_price: z.number().positive().optional(),
  minimum_price: z.number().positive().optional(),
  location: z.object({
    address: z.string().min(5),
    city: z.string().min(2),
    state: z.string().min(2),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  visibility: z.enum(['all_creators', 'exclusive_creators']),
  lead_price: z.number().positive().optional(),
  lead_quota: z.number().int().positive().optional(),
  campaign_start_date: z.string().datetime().optional(),
  campaign_end_date: z.string().datetime().optional(),
})

export const leadSchema = z.object({
  property_id: z.string().uuid(),
  buyer_name: z.string().min(2).max(255),
  buyer_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  buyer_email: z.string().email().optional(),
})

export const inspectionBookingSchema = z.object({
  lead_id: z.string().uuid(),
  property_id: z.string().uuid(),
  slot_time: z.string().datetime(),
})

export const bidSchema = z.object({
  property_id: z.string().uuid(),
  bid_amount: z.number().positive(),
})

export const contractSignSchema = z.object({
  contract_id: z.string().uuid(),
  signature: z.string().min(1),
})

export const walletWithdrawSchema = z.object({
  amount: z.number().positive().min(5000), // Minimum ₦5,000
  bank_account: z.object({
    account_number: z.string().min(10).max(10),
    bank_code: z.string().min(3),
    account_name: z.string().min(2),
  }),
})

export const eventSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20).max(2000).optional(),
  venue: z.string().min(5),
  date: z.string().datetime(),
  capacity: z.number().int().positive(),
  ticket_price: z.number().positive(),
  creator_commission_rate: z.number().min(0).max(100),
})

export const ticketPurchaseSchema = z.object({
  event_id: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
})

