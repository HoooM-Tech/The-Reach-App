import crypto from 'crypto'

const SIGNING_SECRET = process.env.SIGNING_SECRET

if (!SIGNING_SECRET || SIGNING_SECRET === 'default-secret-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SIGNING_SECRET must be set in production environment')
  }
  console.warn('⚠️  WARNING: Using default SIGNING_SECRET. Set SIGNING_SECRET in .env.local for production!')
}

// Use HMAC for secure hash generation and verification
export function generateSecureHash(data: string, timestamp?: number): string {
  const secret = SIGNING_SECRET || 'default-secret-change-in-production'
  const time = timestamp || Date.now()
  return crypto
    .createHmac('sha256', secret)
    .update(`${data}:${time}`)
    .digest('hex')
}

export function verifyHash(data: string, hash: string, timestamp?: number): boolean {
  if (!hash || hash.length !== 64) {
    return false
  }
  
  const secret = SIGNING_SECRET || 'default-secret-change-in-production'
  
  // If timestamp is provided, verify with that specific timestamp
  if (timestamp) {
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(`${data}:${timestamp}`)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))
  }
  
  // Otherwise, verify against current time (within 1 hour window for ticket validation)
  // This allows for clock skew
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  
  for (let offset = -oneHour; offset <= oneHour; offset += 60000) { // Check every minute
    const testTime = now + offset
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(`${data}:${testTime}`)
      .digest('hex')
    
    if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      return true
    }
  }
  
  return false
}

export function signDocument(
  documentId: string,
  userId: string,
  role: 'reach' | 'buyer' | 'developer'
): string {
  return crypto
    .createHash('sha256')
    .update(`${documentId}${userId}${Date.now()}${SIGNING_SECRET}`)
    .digest('hex')
}

export function generateUniqueCode(creatorId: string, propertyId: string): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(8).toString('hex')
  const data = `${creatorId}${propertyId}${timestamp}${random}`
  
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 16) // Use first 16 chars for shorter codes
}

