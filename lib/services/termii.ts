const TERMII_API_KEY = process.env.TERMII_API_KEY
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'ReachApp'
const TERMII_BASE_URL = 'https://v3.api.termii.com'

export async function sendOTP(phone: string, code: string): Promise<void> {
  if (!TERMII_API_KEY) {
    console.warn('TERMII_API_KEY not configured, skipping SMS')
    return
  }

  try {
    const response = await fetch(`${TERMII_BASE_URL}/sms/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        message_type: 'NUMERIC',
        to: phone,
        from: TERMII_SENDER_ID,
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 5,
        pin_length: 6,
        pin_placeholder: '< 1234 >',
        message_text: `Your Reach App verification code is < 1234 >`,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Termii API error: ${error}`)
    }
  } catch (error) {
    console.error('Failed to send OTP via Termii:', error)
    throw error
  }
}

export async function sendSMS(phone: string, message: string): Promise<void> {
  if (!TERMII_API_KEY) {
    console.warn('TERMII_API_KEY not configured, skipping SMS')
    return
  }

  try {
    const response = await fetch(`${TERMII_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        to: phone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Termii API error: ${error}`)
    }
  } catch (error) {
    console.error('Failed to send SMS via Termii:', error)
    throw error
  }
}

