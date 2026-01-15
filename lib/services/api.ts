import { User, Property, Lead, ContractOfSale, Wallet, Handover, Event, Ticket, Notification, TrackingLink } from '@/lib/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`API Error: ${status} ${statusText}`)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData?.error || errorData?.message || response.statusText
    const apiError = new ApiError(response.status, response.statusText, errorData)
    apiError.message = errorMessage
    throw apiError
  }

  return response.json()
}

// File Upload API
export const uploadApi = {
  uploadFile: async (file: File, type: 'image' | 'document' | 'video', bucket?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (bucket) formData.append('bucket', bucket)

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const response = await fetch(`${API_BASE_URL}/upload/file`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(response.status, response.statusText, errorData)
    }

    return response.json() as Promise<{ message: string; file_url: string }>
  },
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetchApi<{ 
      message: string
      user: User
      session: { access_token: string; refresh_token?: string }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    // Store access token
    if (response.session?.access_token && typeof window !== 'undefined') {
      localStorage.setItem('access_token', response.session.access_token)
      if (response.session.refresh_token) {
        localStorage.setItem('refresh_token', response.session.refresh_token)
      }
    }
    return response
  },

  signupDeveloper: async (data: {
    email: string
    phone: string
    full_name: string
    password: string
  }) => {
    return fetchApi<{ user: User }>('/auth/signup/developer', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  signupCreator: async (data: {
    email: string
    phone: string
    full_name: string
    password: string
  }) => {
    return fetchApi<{ user: User }>('/auth/signup/creator', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  signupBuyer: async (data: {
    email: string
    phone: string
    full_name: string
    password: string
  }) => {
    return fetchApi<{ user: User }>('/auth/signup/buyer', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  me: async () => {
    return fetchApi<{ user: User }>('/auth/me')
  },

  logout: async () => {
    const result = await fetchApi('/auth/logout', { method: 'POST' })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    return result
  },

  verifyOtp: async (phone: string, otp: string) => {
    return fetchApi('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    })
  },
}

// Properties API
export const propertiesApi = {
  browse: async (filters?: {
    listing_type?: string
    property_type?: string
    city?: string
    state?: string
    min_price?: number
    max_price?: number
  }) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value))
      })
    }
    const queryString = params.toString()
    return fetchApi<{ properties: (Property & { media?: any[] })[] }>(
      `/properties/browse${queryString ? `?${queryString}` : ''}`
    )
  },

  getById: async (id: string) => {
    return fetchApi<Property & { media?: any[]; documents?: any[] }>(`/properties/${id}`)
  },

  getMyProperties: async () => {
    return fetchApi<{ properties: Property[] }>('/properties/my-properties')
  },

  update: async (id: string, data: Partial<Property>) => {
    return fetchApi<{ property: Property }>(`/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string, permanent?: boolean) => {
    const url = permanent ? `/properties/${id}?permanent=true` : `/properties/${id}`
    return fetchApi<{ message: string }>(url, {
      method: 'DELETE',
    })
  },

  create: async (data: Partial<Property>) => {
    return fetchApi<{ 
      message: string
      property: Property 
    }>('/properties/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  verify: async (id: string) => {
    return fetchApi<{ property: Property }>(`/properties/${id}/verify`, {
      method: 'POST',
    })
  },

  addMedia: async (propertyId: string, imageUrls: string[]) => {
    return fetchApi<{ message: string; media: any[] }>(`/properties/${propertyId}/media`, {
      method: 'POST',
      body: JSON.stringify({ image_urls: imageUrls }),
    })
  },

  deleteMedia: async (propertyId: string, mediaId: string) => {
    return fetchApi<{ message: string }>(`/properties/${propertyId}/media?mediaId=${mediaId}`, {
      method: 'DELETE',
    })
  },

  submitForVerification: async (propertyId: string) => {
    return fetchApi<{ message: string; property: Property }>(`/properties/${propertyId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'active',
        verification_status: 'submitted',
      }),
    })
  },
}

// Creators API
export const creatorsApi = {
  generateLink: async (propertyId: string) => {
    return fetchApi<{ 
      message: string
      link: string
      tracking_link: TrackingLink
      trackingLink?: TrackingLink // Support both formats
    }>('/creators/generate-link', {
      method: 'POST',
      body: JSON.stringify({ property_id: propertyId }),
    })
  },

  linkSocial: async (data: {
    platform: 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'facebook'
    handle: string
    followers?: number
    engagement_rate?: number
  }) => {
    return fetchApi<{
      message: string
      social_account: any
    }>('/creators/link-social', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getAvailableProperties: async () => {
    return fetchApi<{ 
      properties: (Property & { already_promoting?: boolean; media?: any[]; users?: any })[]
      total: number 
    }>('/creators/available-properties')
  },
}

// Leads API
export const leadsApi = {
  submit: async (data: {
    property_id: string
    buyer_name: string
    buyer_phone: string
    buyer_email?: string
    creator_id?: string
  }) => {
    return fetchApi<{ lead: Lead }>('/leads/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Inspections API
export const inspectionsApi = {
  getAvailableSlots: async (propertyId: string, date?: string) => {
    const params = date ? `?date=${date}` : ''
    return fetchApi<{ slots: Array<{ time: string; available: boolean }>; date: string }>(`/inspections/available-slots/${propertyId}${params}`)
  },

  book: async (data: {
    lead_id: string
    property_id: string
    slot_time: string
  }) => {
    return fetchApi<{ message: string; inspection: any }>('/inspections/book', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Payments API
export const paymentsApi = {
  initialize: async (data: {
    property_id: string
    amount: number
    callback_url?: string
  }) => {
    return fetchApi<{ 
      message: string
      authorization_url: string
      reference: string
    }>('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  verify: async (reference: string) => {
    return fetchApi<{ transaction: any }>(`/payments/verify/${reference}`)
  },
}

// Contracts API
export const contractsApi = {
  generate: async (propertyId: string) => {
    return fetchApi<{ contract: ContractOfSale }>(`/contracts/generate/${propertyId}`, {
      method: 'POST',
    })
  },

  getById: async (contractId: string) => {
    return fetchApi<{ contract: ContractOfSale }>(`/contracts/${contractId}`)
  },

  signDeveloper: async (contractId: string) => {
    return fetchApi<{ contract: ContractOfSale }>(`/contracts/${contractId}/sign-developer`, {
      method: 'POST',
    })
  },

  countersignReach: async (contractId: string) => {
    return fetchApi<{ contract: ContractOfSale }>(`/contracts/${contractId}/countersign-reach`, {
      method: 'POST',
    })
  },
}

// Wallet API
export const walletApi = {
  getBalance: async (userId: string) => {
    return fetchApi<{ wallet: Wallet }>(`/wallet/${userId}`)
  },

  withdraw: async (data: { amount: number; bank_account: string }) => {
    return fetchApi('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Handover API
export const handoverApi = {
  submitDocuments: async (propertyId: string, documents: Array<{
    document_type: string
    file: File
  }>) => {
    // Upload files first
    const uploadedDocs = await Promise.all(
      documents.map(async (doc) => {
        const upload = await uploadApi.uploadFile(doc.file, 'document', 'property-documents')
        return {
          document_type: doc.document_type,
          file_url: upload.file_url,
        }
      })
    )

    // Submit document records
    return fetchApi<{ message: string }>(`/handover/submit-documents/${propertyId}`, {
      method: 'POST',
      body: JSON.stringify({ documents: uploadedDocs }),
    })
  },

  verifyDocuments: async (propertyId: string) => {
    return fetchApi<{ message: string }>(`/handover/verify-documents/${propertyId}`, {
      method: 'POST',
    })
  },

  confirmPayment: async (transactionId: string) => {
    return fetchApi<{ message: string }>(`/handover/confirm-payment/${transactionId}`, {
      method: 'POST',
    })
  },

  confirmKeyRelease: async (propertyId: string) => {
    return fetchApi<{ message: string }>(`/handover/confirm-key-release/${propertyId}`, {
      method: 'POST',
    })
  },

  buyerSign: async (propertyId: string) => {
    return fetchApi<{ message: string }>(`/handover/buyer-sign/${propertyId}`, {
      method: 'POST',
    })
  },

  markComplete: async (propertyId: string) => {
    return fetchApi<{ message: string }>(`/handover/mark-complete/${propertyId}`, {
      method: 'POST',
    })
  },
}

// KYC API
export const kycApi = {
  uploadDocuments: async (documents: {
    identity_document: File
    proof_of_address?: File
    business_registration?: File
  }) => {
    // First upload files, then submit document records
    const uploadedFiles: { [key: string]: string } = {}

    // Upload identity document
    const identityUpload = await uploadApi.uploadFile(
      documents.identity_document,
      'document',
      'kyc-documents'
    )
    uploadedFiles.identity_document = identityUpload.file_url

    // Upload proof of address if provided
    if (documents.proof_of_address) {
      const addressUpload = await uploadApi.uploadFile(
        documents.proof_of_address,
        'document',
        'kyc-documents'
      )
      uploadedFiles.proof_of_address = addressUpload.file_url
    }

    // Upload business registration if provided
    if (documents.business_registration) {
      const businessUpload = await uploadApi.uploadFile(
        documents.business_registration,
        'document',
        'kyc-documents'
      )
      uploadedFiles.business_registration = businessUpload.file_url
    }

    // Submit document records
    const documentTypes: { [key: string]: string } = {
      identity_document: 'national_id',
      proof_of_address: 'national_id',
      business_registration: 'business_registration',
    }

    const promises = Object.entries(uploadedFiles).map(([key, file_url]) =>
      fetchApi('/kyc/upload-documents', {
        method: 'POST',
        body: JSON.stringify({
          document_type: documentTypes[key] || 'national_id',
          file_url,
        }),
      })
    )

    return Promise.all(promises)
  },

  getStatus: async (userId: string) => {
    return fetchApi<{ status: string }>(`/kyc/status/${userId}`)
  },
}

// Dashboard API
export const dashboardApi = {
  developer: async (developerId: string) => {
    return fetchApi<{
      properties: {
        total: number
        verified: number
        pending: number
        draft: number
      }
      leads: {
        total: number
        by_property: any[]
        recent: Lead[]
      }
      inspections: {
        total_booked: number
        upcoming: any[]
        completed: number
      }
      payments: {
        total_revenue: number
        pending_escrow: number
        paid_out: number
        transactions: any[]
      }
    }>(`/dashboard/developer/${developerId}`)
  },

  creator: async (creatorId: string) => {
    return fetchApi<{
      tier: number
      social_stats: any[]
      promoting: {
        active_properties: number
        properties: Property[]
      }
      performance: {
        total_impressions: number
        total_clicks: number
        total_leads: number
        conversion_rate: number
        by_property: any[]
      }
      earnings: {
        total_earned: number
        pending: number
        withdrawn: number
        wallet_balance: number
      }
    }>(`/dashboard/creator/${creatorId}`)
  },

  buyer: async (buyerId: string) => {
    return fetchApi<{
      viewed_properties: Property[]
      saved_properties: Property[]
      inspections: {
        upcoming: any[]
        past: any[]
      }
      payments: {
        active_transactions: any[]
        completed: any[]
      }
      handovers: {
        pending: Handover[]
        completed: Handover[]
      }
      document_vault: any[]
      leads: Lead[]
    }>(`/dashboard/buyer/${buyerId}`)
  },
}

// Events API
export const eventsApi = {
  create: async (data: Partial<Event>) => {
    return fetchApi<{ event: Event }>('/events/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Tickets API
export const ticketsApi = {
  purchase: async (data: { event_id: string; quantity: number }) => {
    return fetchApi<{ tickets: Ticket[] }>('/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getByBuyer: async (buyerId: string) => {
    return fetchApi<{ tickets: Ticket[] }>(`/tickets/${buyerId}`)
  },
}

// Notifications API
export const notificationsApi = {
  getUserNotifications: async (userId: string) => {
    return fetchApi<{ notifications: Notification[] }>(`/notifications/user/${userId}`)
  },

  markAsRead: async (notificationId: string) => {
    return fetchApi(`/notifications/${notificationId}/read`, {
      method: 'POST',
    })
  },
}

// Tracking API
export const trackingApi = {
  track: async (uniqueCode: string) => {
    return fetchApi<{ 
      property: Property
      tracking_link: { id: string; unique_code: string }
    }>(`/tracking/${uniqueCode}`)
  },

  trackEvent: async (uniqueCode: string, eventType: 'click' | 'lead') => {
    return fetchApi<{ 
      message: string
      tracking_link: TrackingLink
    }>(`/tracking/${uniqueCode}`, {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType }),
    })
  },
}

// Admin API
export const adminApi = {
  getPendingVerificationProperties: async () => {
    return fetchApi<{ properties: (Property & { documents?: any[]; media?: any[]; users?: any })[] }>('/admin/properties/pending-verification')
  },

  getAllProperties: async (status?: 'all' | 'pending' | 'verified' | 'rejected' | 'draft') => {
    const params = status ? `?status=${status}` : ''
    return fetchApi<{ properties: (Property & { documents?: any[]; media?: any[]; users?: any })[]; total: number }>(`/admin/properties/all${params}`)
  },

  verifyProperty: async (propertyId: string, action: 'approve' | 'reject', reason?: string) => {
    return fetchApi<{ message: string; property: Property }>(`/properties/${propertyId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason }),
    })
  },
}

export { ApiError }

