/**
 * Production API Client
 * Handles all authenticated requests to the backend
 * NO mock data - all calls go to real endpoints
 */

// ===========================================
// Token Management
// ===========================================

const ACCESS_TOKEN_KEY = 'reach_access_token';
const REFRESH_TOKEN_KEY = 'reach_refresh_token';
const USER_KEY = 'reach_user';

/**
 * Get access token from Supabase session
 * Since we migrated to Supabase SSR, tokens are in cookies, not localStorage
 * This function is kept for backward compatibility but should be replaced
 * with direct Supabase session access in new code
 */
export async function getAccessTokenAsync(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const { createSupabaseClient } = await import('@/lib/supabase/client');
    const supabase = createSupabaseClient();
    // SECURITY: Use getUser() instead of getSession() to verify token with Supabase Auth server
    // getUser() validates the token and returns user data, preventing stale/invalid sessions
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // Get session after verifying user to ensure token is valid
    // Note: This is for legacy compatibility - new code should use cookies directly
    const { data: { session } } = await supabase.auth.getSession();
    
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * @deprecated Use getAccessTokenAsync() or get token directly from Supabase session
 * This function only checks localStorage which is empty after Supabase SSR migration
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Legacy support - check localStorage first
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem(USER_KEY);
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ===========================================
// API Error Handling
// ===========================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ===========================================
// Base URL Configuration
// ===========================================

/**
 * Get the base URL for API requests
 * In Next.js, we use relative URLs for same-origin requests
 * This ensures requests go to the Next.js API routes
 */
function getApiBaseUrl(): string {
  // In browser, use relative URLs (Next.js handles routing)
  if (typeof window !== 'undefined') {
    return '';
  }
  // On server, use absolute URL if available
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || '';
}

/**
 * Normalize endpoint to ensure it starts with /api/
 */
function normalizeEndpoint(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If endpoint already starts with /api/, use as-is
  if (cleanEndpoint.startsWith('/api/')) {
    return cleanEndpoint;
  }
  
  // Otherwise, prepend /api/
  return `/api${cleanEndpoint}`;
}

// ===========================================
// Base Fetch with Auth
// ===========================================

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  
  // Normalize endpoint to ensure correct path
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${normalizedEndpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Ensure method is set (default to GET if not specified)
  const method = options.method || 'GET';

  try {
    const response = await fetch(fullUrl, {
      ...options,
      method,
      headers,
    });

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Handle session expiry (401) - dispatch event but let middleware handle redirect
      if (response.status === 401) {
        // Clear tokens immediately
        clearTokens();
        
        // Dispatch event to notify UserContext and other listeners
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('session-expired', {
            detail: { message: 'Session expired. Please log in again.' }
          }));
          
          // DO NOT redirect here - middleware will handle redirects
          // Redirecting here causes loops when middleware also redirects
          // The next navigation will trigger middleware which will redirect to /login
        }
      }
      
      const errorMessage = typeof data === 'object' ? data.error || data.message : data;
      throw new ApiError(
        errorMessage || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data as T;
  } catch (error) {
    // Enhanced error logging for debugging
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    console.error('API request failed:', {
      url: fullUrl,
      method,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}

// ===========================================
// Type Definitions
// ===========================================

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
    role: 'developer' | 'creator' | 'buyer' | 'admin';
    tier?: number;
    kyc_status: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}

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
    recent: Array<any>;
  };
  inspections: {
    total_booked: number;
    upcoming: Array<any>;
    recently_booked: Array<any>;
    completed: number;
  };
  payments: {
    total_revenue: number;
    pending_escrow: number;
    paid_out: number;
    transactions: Array<any>;
  };
}

export interface CreatorDashboardData {
  tier: number;
  social_stats: Array<any>;
  promoting: {
    active_properties: number;
    properties: Array<any>;
  };
  performance: {
    total_impressions: number;
    total_clicks: number;
    total_leads: number;
    conversion_rate: number;
    by_property: Array<{
      id: string;
      property_id: string;
      property_title: string;
      unique_code: string;
      tracking_url: string;
      impressions: number;
      clicks: number;
      leads: number;
      inspections: number;
      conversions: number;
      conversion_rate: number;
      created_at: string;
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
  viewed_properties: Array<any>;
  saved_properties: Array<any>;
  inspections: {
    upcoming: Array<any>;
    past: Array<any>;
  };
  payments: {
    active_transactions: Array<any>;
    completed: Array<any>;
  };
  handovers: {
    pending: Array<any>;
    completed: Array<any>;
  };
  document_vault: Array<any>;
  leads: Array<any>;
}

export interface Property {
  id: string;
  developer_id: string;
  title: string;
  description?: string;
  listing_type: 'sale' | 'rent' | 'lead_generation';
  property_type?: string;
  asking_price?: number;
  minimum_price?: number;
  location?: {
    address: string;
    city: string;
    state: string;
    coordinates?: { lat: number; lng: number };
  };
  visibility: 'all_creators' | 'exclusive_creators';
  verification_status: 'draft' | 'submitted' | 'pending_verification' | 'verified' | 'rejected';
  status: 'active' | 'sold' | 'rented' | 'paused' | 'draft';
  created_at: string;
  updated_at: string;
  media?: Array<{ id: string; url: string; type: string }>;
}

export interface WalletData {
  wallet: {
    id: string;
    user_id: string;
    balance: number;
    locked_balance: number;
  };
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    created_at: string;
  }>;
}

// ===========================================
// Auth API
// ===========================================

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    // Use fetch directly (not fetchWithAuth) since we don't have a token yet
    const baseUrl = getApiBaseUrl();
    const normalizedEndpoint = normalizeEndpoint('/api/auth/login');
    const fullUrl = `${baseUrl}${normalizedEndpoint}`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // CRITICAL: Include cookies in request/response
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new ApiError(
        errorData.error || 'Login failed',
        response.status,
        errorData
      );
    }

    const data = await response.json() as LoginResponse;

    // Store user data in localStorage for client-side access
    // But DO NOT store tokens - cookies are used for auth
    if (data.user) {
      setStoredUser(data.user);
    }

    return data;
  },

  async signupDeveloper(data: {
    email: string;
    password: string;
    phone: string;
    full_name: string;
  }) {
    return fetchWithAuth('/api/auth/signup/developer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async signupCreator(data: {
    email: string;
    password: string;
    phone: string;
    full_name: string;
  }) {
    return fetchWithAuth('/api/auth/signup/creator', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async signupBuyer(data: {
    email: string;
    password: string;
    phone: string;
    full_name: string;
  }) {
    return fetchWithAuth('/api/auth/signup/buyer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verifyOtp(phone: string, otp: string) {
    return fetchWithAuth('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  },

  async getCurrentUser(): Promise<{ user: any }> {
    return fetchWithAuth('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } finally {
      clearTokens();
    }
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },
};

// ===========================================
// Dashboard APIs - Role Specific
// ===========================================

// ===========================================
// Profile API - Shared across all roles
// ===========================================

export const profileApi = {
  /** Get current user's profile */
  async getProfile(): Promise<{
    profile: {
      id: string;
      email: string;
      phone?: string;
      full_name?: string;
      role: string;
      tier?: number;
      kyc_status: string;
      avatar_url?: string;
      company_name?: string;
      cac_number?: string;
      business_address?: string;
      created_at: string;
      updated_at: string;
    };
    stats?: {
      earned?: number;
      sold?: number;
      rating?: number;
    };
  }> {
    return fetchWithAuth('/api/user/profile');
  },

  /** Update current user's profile */
  async updateProfile(data: {
    full_name?: string;
    phone?: string;
    company_name?: string;
    cac_number?: string;
    business_address?: string;
    avatar_url?: string;
  }): Promise<{
    message: string;
    profile: any;
  }> {
    return fetchWithAuth('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const developerApi = {
  /** Get developer dashboard data - properties, leads, inspections, payments */
  async getDashboard(developerId: string): Promise<DeveloperDashboardData> {
    return fetchWithAuth(`/api/dashboard/developer/${developerId}`);
  },

  /** Get developer's properties */
  async getMyProperties(): Promise<{ properties: Property[] }> {
    return fetchWithAuth('/api/properties/my-properties');
  },

  /** Create a new property */
  async createProperty(data: Partial<Property>): Promise<{ property: Property; message: string }> {
    return fetchWithAuth('/api/properties/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Update a property */
  async updateProperty(id: string, data: Partial<Property>): Promise<{ property: Property; message: string }> {
    return fetchWithAuth(`/api/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /** Get single property details (for editing) - uses developer-specific endpoint */
  async getProperty(id: string): Promise<Property> {
    // Use the details endpoint which allows developers to access their own properties
    // This endpoint returns { property: {...}, stats: {...}, ... }
    const response = await fetchWithAuth<{ property: Property }>(`/api/properties/${id}/details`);
    return response.property;
  },

  /** Submit property for verification */
  /** @deprecated - Use updateProperty with verification_status: 'submitted' instead */
  async submitForVerification(id: string): Promise<{ property: Property; message: string }> {
    // This endpoint doesn't exist for developers - they should use updateProperty instead
    // Keeping for backward compatibility but it will fail
    return fetchWithAuth(`/api/properties/${id}/verify`, {
      method: 'POST',
    });
  },

  /** Upload media to property */
  async uploadMedia(propertyId: string, formData: FormData): Promise<any> {
    const token = getAccessToken();
    const response = await fetch(`/api/properties/${propertyId}/media`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(data.error || 'Upload failed', response.status, data);
    }
    return response.json();
  },
};

export const creatorApi = {
  /** Get creator dashboard data - performance, earnings, tracking links */
  async getDashboard(creatorId: string): Promise<CreatorDashboardData> {
    return fetchWithAuth(`/api/dashboard/creator/${creatorId}`);
  },

  /** Get available properties to promote */
  async getAvailableProperties(): Promise<{ properties: Property[] }> {
    return fetchWithAuth('/api/creators/available-properties');
  },

  /** Generate tracking link for a property */
  async generateTrackingLink(propertyId: string): Promise<{ link: any; message: string }> {
    return fetchWithAuth('/api/creators/generate-link', {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId }),
    });
  },

  /** Link social media account */
  async linkSocialAccount(data: { platform: string; handle: string }): Promise<{ message: string }> {
    return fetchWithAuth('/api/creators/link-social', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Verify social media accounts and calculate tier */
  async verifySocialAccounts(socialLinks: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
  }): Promise<{
    success: boolean;
    tier?: number;
    analytics?: Record<string, any>;
    message?: string;
    error?: string;
    details?: string[];
    warnings?: string[];
  }> {
    return fetchWithAuth('/api/creators/verify-social', {
      method: 'POST',
      body: JSON.stringify({ socialLinks }),
    });
  },

  /** Get creator promotions */
  async getPromotions(filters?: { search?: string; status?: string }): Promise<{
    promotions: any[];
    total: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    return fetchWithAuth(`/api/creator/promotions?${params}`);
  },

  /** Get promotion details */
  async getPromotionDetails(promotionId: string): Promise<{
    promotion: any;
    property: any;
  }> {
    return fetchWithAuth(`/api/creator/promotions/${promotionId}`);
  },

  /** Get promotion analytics */
  async getPromotionAnalytics(promotionId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    stats: any;
    chartData: any[];
    period: string;
  }> {
    return fetchWithAuth(`/api/creator/analytics/${promotionId}?period=${period}`);
  },

  /** Pause a promotion */
  async pausePromotion(promotionId: string): Promise<{
    message: string;
    promotion: { id: string; status: string; paused_at: string };
  }> {
    return fetchWithAuth(`/api/creator/promotions/${promotionId}/pause`, {
      method: 'POST',
    });
  },

  /** Resume a promotion */
  async resumePromotion(promotionId: string): Promise<{
    message: string;
    promotion: { id: string; status: string };
  }> {
    return fetchWithAuth(`/api/creator/promotions/${promotionId}/resume`, {
      method: 'POST',
    });
  },

  /** Stop a promotion (irreversible) */
  async stopPromotion(promotionId: string): Promise<{
    message: string;
    promotion: { id: string; status: string; stopped_at: string };
  }> {
    return fetchWithAuth(`/api/creator/promotions/${promotionId}/stop`, {
      method: 'POST',
    });
  },

  /** Update promotion status (legacy - use pause/resume/stop instead) */
  async updatePromotionStatus(promotionId: string, status: 'active' | 'paused' | 'stopped'): Promise<{
    message: string;
    promotion: { id: string; status: string };
  }> {
    return fetchWithAuth(`/api/creator/promotions/${promotionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

export const buyerApi = {
  /** Get buyer dashboard data - inspections, payments, handovers */
  async getDashboard(buyerId: string): Promise<BuyerDashboardData> {
    return fetchWithAuth(`/api/dashboard/buyer/${buyerId}`);
  },

  /** Browse verified properties with filters and pagination */
  async browseProperties(filters?: {
    page?: number;
    limit?: number;
    location?: string;
    property_type?: string;
    min_price?: number;
    max_price?: number;
  }): Promise<{
    properties: Property[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.location) params.set('location', filters.location);
    if (filters?.property_type) params.set('property_type', filters.property_type);
    if (filters?.min_price) params.set('min_price', filters.min_price.toString());
    if (filters?.max_price) params.set('max_price', filters.max_price.toString());
    return fetchWithAuth(`/api/properties/browse?${params}`);
  },

  /** Get property details */
  async getProperty(id: string): Promise<{ property: Property }> {
    return fetchWithAuth(`/api/properties/${id}`);
  },

  /** Get notification counts for badges */
  async getNotificationCounts(): Promise<{
    inspections: number;
    handovers: number;
    notifications: number;
  }> {
    return fetchWithAuth('/api/notifications/counts');
  },

  /** Get unread notification status */
  async getUnreadStatus(): Promise<{
    hasUnread: boolean;
    unreadCount: number;
  }> {
    return fetchWithAuth('/api/notifications/unread-status');
  },

  /** Get property types for filter dropdown */
  async getPropertyTypes(): Promise<{
    types: Array<{ value: string; label: string }>;
  }> {
    return fetchWithAuth('/api/properties/types');
  },

  /** Get property count for current filters */
  async getPropertyCount(filters?: {
    location?: string;
    property_type?: string;
    min_price?: number;
    max_price?: number;
  }): Promise<{ count: number }> {
    const params = new URLSearchParams();
    if (filters?.location) params.set('location', filters.location);
    if (filters?.property_type) params.set('property_type', filters.property_type);
    if (filters?.min_price) params.set('min_price', filters.min_price.toString());
    if (filters?.max_price) params.set('max_price', filters.max_price.toString());
    return fetchWithAuth(`/api/properties/count?${params}`);
  },

  /** Search locations for autocomplete */
  async searchLocations(query: string): Promise<{ suggestions: string[] }> {
    return fetchWithAuth(`/api/locations/search?q=${encodeURIComponent(query)}`);
  },

  /** Submit a lead for a property */
  async submitLead(data: {
    property_id: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_email?: string;
    source_code?: string;
  }): Promise<{ lead: any; message: string }> {
    return fetchWithAuth('/api/leads/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Get available inspection slots */
  async getInspectionSlots(propertyId: string, date?: string): Promise<{ slots: any[]; date?: string }> {
    const params = date ? `?date=${date}` : '';
    return fetchWithAuth(`/api/inspections/available-slots/${propertyId}${params}`);
  },

  /** Book an inspection */
  async bookInspection(data: {
    property_id: string;
    lead_id?: string;
    slot_time: string;
    notes?: string;
  }): Promise<{ inspection: any; message: string }> {
    return fetchWithAuth('/api/inspections/book', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Submit bid on property */
  async submitBid(propertyId: string, data: { amount: number; message?: string }): Promise<{ message: string }> {
    return fetchWithAuth(`/api/properties/${propertyId}/bids`, {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        bid_amount: data.amount,
        message: data.message,
      }),
    });
  },
};

// ===========================================
// Wallet API - Shared but role-aware
// ===========================================

export const walletApi = {
  /** Setup wallet with PIN */
  async setup(pin: string, confirmPin: string): Promise<{ success: boolean; wallet: any; message: string }> {
    return fetchWithAuth('/api/wallet/setup', {
      method: 'POST',
      body: JSON.stringify({ pin, confirmPin }),
    });
  },

  /** Verify PIN */
  async verifyPin(pin: string): Promise<{ success: boolean; valid: boolean }> {
    return fetchWithAuth('/api/wallet/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  /** Get wallet balance */
  async getBalance(): Promise<{ availableBalance: number; lockedBalance: number; currency: string; isSetup: boolean }> {
    const response = await fetchWithAuth<any>('/api/wallet/balance');
    
    // API returns: { success: true, data: { available_balance, locked_balance, ... } }
    if (response.data) {
      return {
        availableBalance: response.data.available_balance || 0,
        lockedBalance: response.data.locked_balance || 0,
        currency: response.data.currency || 'NGN',
        isSetup: response.data.is_setup || false,
      };
    }
    
    // Fallback for legacy format
    return {
      availableBalance: response.availableBalance || response.available_balance || 0,
      lockedBalance: response.lockedBalance || response.locked_balance || 0,
      currency: response.currency || 'NGN',
      isSetup: response.isSetup || response.is_setup || false,
    };
  },

  /** Get transactions */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: 'credit' | 'debit';
    status?: 'pending' | 'successful' | 'failed';
    category?: string;
  }): Promise<{ transactions: any[]; total: number; page: number; pages: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    
    const query = queryParams.toString();
    const response = await fetchWithAuth<any>(`/api/wallet/transactions${query ? `?${query}` : ''}`);
    
    // API returns: { success: true, data: { transactions: [...], pagination: {...} } }
    // Extract and normalize the response structure
    if (response.data) {
      return {
        transactions: response.data.transactions || [],
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        pages: response.data.pagination?.total_pages || 0,
      };
    }
    
    // Fallback for legacy format: { transactions: [...] }
    return {
      transactions: response.transactions || [],
      total: response.total || 0,
      page: response.page || 1,
      pages: response.pages || 0,
    };
  },

  /** Get transaction details */
  async getTransaction(id: string): Promise<{ transaction: any }> {
    const response = await fetchWithAuth<any>(`/api/wallet/transactions/${id}`);
    
    // API returns: { success: true, data: { id, type, category, ... } }
    // Extract and normalize the response structure
    if (response.data) {
      return {
        transaction: response.data,
      };
    }
    
    // Fallback for legacy format: { transaction: {...} }
    return {
      transaction: response.transaction || response,
    };
  },

  /** Get bank accounts */
  async getBankAccounts(): Promise<{ bankAccounts: any[] }> {
    const response = await fetchWithAuth<any>('/api/wallet/bank-accounts');
    
    // API returns: { success: true, data: [...] }
    // Normalize to match expected structure
    if (response.data && Array.isArray(response.data)) {
      return {
        bankAccounts: response.data,
      };
    }
    
    // Fallback for legacy format: { bankAccounts: [...] }
    return {
      bankAccounts: response.bankAccounts || [],
    };
  },

  /** Add bank account */
  async addBankAccount(data: {
    bankName: string;
    accountNumber: string;
    bankCode: string;
  }): Promise<{ success: boolean; bankAccount: any; verified: boolean }> {
    return fetchWithAuth('/api/wallet/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Delete bank account */
  async deleteBankAccount(id: string): Promise<{ success: boolean }> {
    return fetchWithAuth(`/api/wallet/bank-accounts/${id}`, {
      method: 'DELETE',
    });
  },

  /** Request withdrawal */
  async withdraw(data: {
    amount: number;
    bankAccountId: string;
    pin: string;
  }): Promise<{ success: boolean; transaction: any; reference: string }> {
    return fetchWithAuth('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Add funds to wallet (Developer only) */
  async addFunds(amount: number): Promise<{ success: boolean; authorizationUrl: string; reference: string }> {
    return fetchWithAuth('/api/wallet/add-funds', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
};

// ===========================================
// Notifications API
// ===========================================

export const notificationsApi = {
  /** Get user's notifications */
  async getNotifications(userId: string): Promise<{ notifications: any[] }> {
    return fetchWithAuth(`/api/notifications/user/${userId}`);
  },

  /** Mark notification as read */
  async markAsRead(notificationId: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  /** Mark all notifications as read */
  async markAllAsRead(): Promise<{ message: string; success: boolean }> {
    return fetchWithAuth('/api/notifications/mark-all-read', {
      method: 'POST',
    });
  },
};

// ===========================================
// Developer Notification Settings API
// ===========================================

export const notificationSettingsApi = {
  /** Get notification settings */
  async getSettings(): Promise<{
    contractUpdate: boolean;
    newLeads: boolean;
    inspectionBookings: boolean;
    handoverReminders: boolean;
    payoutUpdate: boolean;
  }> {
    return fetchWithAuth('/api/developer/notifications/settings');
  },

  /** Update notification settings */
  async updateSettings(settings: {
    contractUpdate?: boolean;
    newLeads?: boolean;
    inspectionBookings?: boolean;
    handoverReminders?: boolean;
    payoutUpdate?: boolean;
  }): Promise<{ success: boolean; message: string; settings: any }> {
    return fetchWithAuth('/api/developer/notifications/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};

// ===========================================
// KYC API
// ===========================================

export const kycApi = {
  /** Get KYC status */
  async getStatus(userId: string): Promise<{ status: string; documents: any[] }> {
    return fetchWithAuth(`/api/kyc/status/${userId}`);
  },

  /** Upload KYC documents */
  async uploadDocuments(formData: FormData): Promise<{ message: string }> {
    const token = getAccessToken();
    const response = await fetch('/api/kyc/upload-documents', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(data.error || 'Upload failed', response.status, data);
    }
    return response.json();
  },
};

// ===========================================
// File Upload API
// ===========================================

export const uploadApi = {
  /** Upload a file */
  async uploadFile(file: File, type: 'image' | 'document' | 'video', bucket?: string): Promise<{ file_url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (bucket) {
      formData.append('bucket', bucket);
    }

    const token = getAccessToken();
    const response = await fetch('/api/upload/file', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new ApiError(data.error || 'Upload failed', response.status, data);
    }

    return response.json();
  },
};

// ===========================================
// Handover API (for buyers)
// ===========================================

export const handoverApi = {
  /** Buyer signs handover document */
  async buyerSign(propertyId: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/handover/buyer-sign/${propertyId}`, {
      method: 'POST',
    });
  },
};

// ===========================================
// Default Export
// ===========================================

export const api = {
  auth: authApi,
  profile: profileApi,
  developer: developerApi,
  creator: creatorApi,
  buyer: buyerApi,
  wallet: walletApi,
  notifications: notificationsApi,
  kyc: kycApi,
  upload: uploadApi,
  handover: handoverApi,
};

export default api;


