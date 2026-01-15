import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/services/push-notifications'

export async function GET() {
  try {
    const publicKey = getVapidPublicKey()
    return NextResponse.json({ publicKey })
  } catch (error) {
    return NextResponse.json(
      { error: 'VAPID public key not configured' },
      { status: 500 }
    )
  }
}

