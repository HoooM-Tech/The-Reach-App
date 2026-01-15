/**
 * Core application types
 * These types match the backend API responses
 */

// ===========================================
// User Types
// ===========================================

export type UserRole = 'developer' | 'creator' | 'buyer' | 'admin';

export type KYCStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  name?: string; // Alias for full_name
  phone?: string;
  role: UserRole;
  tier?: number;
  kyc_status: KYCStatus;
  isVerified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

// ===========================================
// Property Types
// ===========================================

export type ListingType = 'sale' | 'rent' | 'lead_generation';
export type PropertyVisibility = 'all_creators' | 'exclusive_creators';
export type VerificationStatus = 'draft' | 'submitted' | 'pending_verification' | 'verified' | 'rejected';
export type PropertyStatus = 'active' | 'sold' | 'rented' | 'paused' | 'draft';

export interface PropertyLocation {
  address?: string;
  city: string;
  state: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PropertyMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  sort_order?: number;
}

export interface Property {
  id: string;
  developer_id: string;
  title: string;
  description?: string;
  listing_type: ListingType;
  property_type?: string;
  asking_price?: number;
  minimum_price?: number;
  currency?: 'NGN' | 'USD';
  location?: PropertyLocation;
  bedrooms?: number;
  bathrooms?: number;
  visibility: PropertyVisibility;
  verification_status: VerificationStatus;
  status: PropertyStatus;
  media?: PropertyMedia[];
  created_at: string;
  updated_at: string;
}

// ===========================================
// Lead Types
// ===========================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface Lead {
  id: string;
  property_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  source_code?: string;
  status: LeadStatus;
  created_at: string;
  properties?: Property;
}

// ===========================================
// Inspection Types
// ===========================================

export type InspectionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Inspection {
  id: string;
  property_id: string;
  lead_id?: string;
  buyer_id?: string;
  slot_time: string;
  status: InspectionStatus;
  notes?: string;
  created_at: string;
  properties?: Property;
  leads?: Lead;
}

// ===========================================
// Wallet Types
// ===========================================

export type TransactionType = 'credit' | 'debit' | 'deposit' | 'withdrawal';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  locked_balance: number;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: TransactionStatus;
  created_at: string;
}

// ===========================================
// Tracking Link Types (Creator)
// ===========================================

export interface TrackingLink {
  id: string;
  property_id: string;
  creator_id: string;
  unique_code: string;
  tracking_url: string;
  impressions: number;
  clicks: number;
  leads: number;
  inspections: number;
  conversions: number;
  created_at: string;
  properties?: Property;
}

// ===========================================
// Handover Types
// ===========================================

export type HandoverStatus = 'pending' | 'documents_submitted' | 'payment_confirmed' | 'completed';

export interface Handover {
  id: string;
  property_id: string;
  buyer_id: string;
  developer_id: string;
  status: HandoverStatus;
  documents?: any;
  created_at: string;
  properties?: Property;
}

// ===========================================
// Notification Types
// ===========================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

// ===========================================
// Dashboard Data Types
// ===========================================

export interface DeveloperDashboardData {
  properties: {
    total: number;
    verified: number;
    pending: number;
    draft: number;
  };
  leads: {
    total: number;
    by_property: Array<{
      property_id: string;
      property_title: string;
      count: number;
    }>;
    recent: Lead[];
  };
  inspections: {
    total_booked: number;
    upcoming: Inspection[];
    recently_booked: Inspection[];
    completed: number;
  };
  payments: {
    total_revenue: number;
    pending_escrow: number;
    paid_out: number;
    transactions: Transaction[];
  };
}

export interface CreatorDashboardData {
  tier: number;
  social_stats: any[];
  promoting: {
    active_properties: number;
    properties: Property[];
  };
  performance: {
    total_impressions: number;
    total_clicks: number;
    total_leads: number;
    conversion_rate: number;
    by_property: Array<TrackingLink & {
      property_title: string;
      conversion_rate: number;
    }>;
  };
  earnings: {
    total_earned: number;
    pending: number;
    withdrawn: number;
    wallet_balance: number;
  };
}

export interface BuyerDashboardData {
  viewed_properties: Property[];
  saved_properties: Property[];
  inspections: {
    upcoming: Inspection[];
    past: Inspection[];
  };
  payments: {
    active_transactions: Transaction[];
    completed: Transaction[];
  };
  handovers: {
    pending: Handover[];
    completed: Handover[];
  };
  document_vault: any[];
  leads: Lead[];
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
