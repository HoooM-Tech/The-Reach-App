export type UserRole = 'developer' | 'creator' | 'buyer' | 'admin' | 'organizer'
export type ListingType = 'sale' | 'rent' | 'lead_generation'
export type PropertyType = 'land' | 'house' | 'apartment' | 'commercial'
export type VerificationStatus = 'draft' | 'submitted' | 'pending_verification' | 'verified' | 'rejected'
export type PropertyStatus = 'active' | 'sold' | 'rented' | 'paused' | 'draft'
export type Visibility = 'all_creators' | 'exclusive_creators'
export type ContractStatus = 'pending_developer_signature' | 'signed_by_developer' | 'countersigned_by_reach' | 'executed'
export type EscrowStatus = 'held' | 'released' | 'refunded'
export type HandoverStatus = 
  | 'payment_confirmed'
  | 'pending_developer_docs'
  | 'docs_submitted'
  | 'docs_verified'
  | 'keys_released'
  | 'reach_signed'
  | 'buyer_signed'
  | 'keys_delivered'
  | 'completed'
export type RentalStatus = 'booked' | 'pending_handover' | 'docs_submitted' | 'tenant_signed' | 'keys_delivered' | 'active' | 'expired' | 'renewed'
export type EventStatus = 'draft' | 'active' | 'sold_out' | 'completed' | 'cancelled'
export type TicketStatus = 'active' | 'used' | 'refunded'
export type NotificationType = 
  | 'signup_verification'
  | 'otp_code'
  | 'property_verified'
  | 'property_rejected'
  | 'contract_ready'
  | 'new_lead'
  | 'inspection_booked'
  | 'inspection_reminder'
  | 'payment_confirmed'
  | 'escrow_released'
  | 'payout_processed'
  | 'handover_pending'
  | 'documents_ready'
  | 'keys_ready'
  | 'handover_complete'
  | 'ticket_purchased'
  | 'event_reminder'

export interface User {
  id: string
  email: string
  phone?: string
  full_name?: string
  role: UserRole
  tier?: number
  oauth_provider?: string
  oauth_id?: string
  kyc_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  updated_at: string
}

export interface SocialAccount {
  id: string
  user_id: string
  platform: string
  handle?: string
  followers?: number
  engagement_rate?: number
  verified_at?: string
  created_at: string
}

export interface Property {
  id: string
  developer_id: string
  title: string
  description?: string
  listing_type: ListingType
  property_type?: PropertyType
  asking_price?: number
  minimum_price?: number
  location: {
    address: string
    city: string
    state: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  visibility: Visibility
  verification_status: VerificationStatus
  status: PropertyStatus
  lead_price?: number
  lead_quota?: number
  leads_generated?: number
  campaign_start_date?: string
  campaign_end_date?: string
  created_at: string
  updated_at: string
}

export interface TrackingLink {
  id: string
  creator_id: string
  property_id: string
  unique_code: string
  impressions: number
  clicks: number
  leads: number
  inspections: number
  conversions: number
  created_at: string
}

export interface Lead {
  id: string
  property_id: string
  creator_id?: string
  buyer_name: string
  buyer_phone: string
  buyer_email?: string
  source_link?: string
  status: string
  created_at: string
}

export interface ContractOfSale {
  id: string
  property_id: string
  developer_id: string
  terms: {
    property_details: {
      address: string
      type: string
      description: string
    }
    asking_price: number
    minimum_acceptable_price: number
    creator_commission_percentage: number
    sales_mode: string
    dynamic_pricing_enabled: boolean
    payout_rules: {
      developer_percentage: number
      reach_percentage: number
      creator_percentage: number
    }
    document_handover_obligations: string[]
    dispute_resolution_clause: string
    termination_clause: string
  }
  developer_signature?: string
  developer_signed_at?: string
  reach_signature?: string
  reach_signed_at?: string
  reach_admin_id?: string
  status: ContractStatus
  created_at: string
}

export interface EscrowTransaction {
  id: string
  property_id: string
  buyer_id: string
  developer_id: string
  creator_id?: string
  amount: number
  splits: {
    developer_amount: number
    creator_amount: number
    reach_amount: number
  }
  status: EscrowStatus
  payment_reference?: string
  released_at?: string
  created_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  locked_balance: number
  created_at: string
  updated_at: string
}

export interface Handover {
  id: string
  property_id: string
  transaction_id?: string
  developer_id: string
  buyer_id: string
  type: 'sale' | 'long_term_rental' | 'short_term_rental'
  status: HandoverStatus
  payment_confirmed_at?: string
  documents_submitted_at?: string
  documents_verified_at?: string
  keys_released_at?: string
  reach_signed_at?: string
  buyer_signed_at?: string
  keys_delivered_at?: string
  completed_at?: string
  created_at: string
}

export interface Event {
  id: string
  organizer_id: string
  title: string
  description?: string
  venue: string
  date: string
  capacity: number
  ticket_price: number
  creator_commission_rate: number
  verification_status: 'pending' | 'verified' | 'rejected'
  tickets_sold: number
  status: EventStatus
  created_at: string
}

export interface Ticket {
  id: string
  event_id: string
  buyer_id: string
  creator_id?: string
  qr_code: string
  purchase_date: string
  validated_at?: string
  status: TicketStatus
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, any>
  read: boolean
  created_at: string
}

