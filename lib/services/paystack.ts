const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY
const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export interface InitializePaymentParams {
  email: string
  amount: number // in kobo (smallest currency unit)
  reference?: string
  metadata?: Record<string, any>
  callback_url?: string
}

export interface PaymentResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export async function initializePayment(
  params: InitializePaymentParams
): Promise<PaymentResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callback_url,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Paystack API error: ${error.message || 'Unknown error'}`)
  }

  return response.json()
}

export async function verifyPayment(reference: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Paystack API error: ${error.message || 'Unknown error'}`)
  }

  return response.json()
}

export async function createTransferRecipient(
  accountNumber: string,
  bankCode: string,
  accountName: string
) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
    body: JSON.stringify({
      type: 'nuban',
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Paystack API error: ${error.message || 'Unknown error'}`)
  }

  return response.json()
}

export async function initiateTransfer(
  recipientCode: string,
  amount: number,
  reference: string,
  reason?: string
) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
    body: JSON.stringify({
      source: 'balance',
      amount: amount,
      recipient: recipientCode,
      reference: reference,
      reason: reason || 'Payout',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Paystack API error: ${error.message || 'Unknown error'}`)
  }

  return response.json()
}

export interface VerifyAccountResponse {
  status: boolean
  message: string
  data: {
    account_number: string
    account_name: string
    bank_id: number
  }
}

export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<VerifyAccountResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await fetch(
    `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Paystack API error: ${error.message || 'Unknown error'}`)
  }

  return response.json()
}

export async function getBanks() {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured')
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/bank?currency=NGN`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Paystack API error: ${error.message || 'Unknown error'}`)
  }

  return response.json()
}
