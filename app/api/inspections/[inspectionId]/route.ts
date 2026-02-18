import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/utils/auth'
import { handleError, NotFoundError } from '@/lib/utils/errors'
import { normalizeNigerianPhone } from '@/lib/utils/phone'

export async function GET(
  req: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser()
    const inspectionId = params.inspectionId

    const adminSupabase = createAdminSupabaseClient()

    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select(
        '*, properties(id, developer_id, title, description, location, asking_price, bedrooms, bathrooms, sqft, rating, review_count, property_media(url, order_index, media_type)), leads(buyer_name, buyer_email, buyer_phone)'
      )
      .eq('id', inspectionId)
      .single()

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection')
    }

    const property = inspection.properties as any

    if (currentUser.role === 'developer' || currentUser.role === 'admin') {
      if (currentUser.role !== 'admin' && currentUser.id !== property?.developer_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (currentUser.role === 'buyer') {
      let hasAccess = inspection.buyer_id === currentUser.id
      if (!hasAccess) {
        const lead = inspection.leads as any
        const userEmail = currentUser.email?.toLowerCase()
        if (userEmail && lead?.buyer_email?.toLowerCase() === userEmail) {
          hasAccess = true
        }
        if (!hasAccess && lead?.buyer_phone && currentUser.phone) {
          try {
            const normalizedLeadPhone = normalizeNigerianPhone(lead.buyer_phone)
            const normalizedUserPhone = normalizeNigerianPhone(currentUser.phone)
            if (normalizedLeadPhone === normalizedUserPhone) {
              hasAccess = true
            }
          } catch {
            hasAccess = false
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: transactions } = await adminSupabase
      .from('transactions')
      .select('id, amount, status, reference, created_at, completed_at, metadata')
      .contains('metadata', { inspection_id: inspectionId })
      .order('created_at', { ascending: false })

    // Check if buyer has already paid for this property (for buyer role only)
    let propertyPaid = false
    if (currentUser.role === 'buyer' && property?.id) {
      const { count } = await adminSupabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('property_id', property.id)
        .eq('category', 'property_purchase')
        .in('status', ['successful', 'completed'])
      propertyPaid = (count ?? 0) > 0
    }

    return NextResponse.json({
      inspection,
      transactions: transactions || [],
      propertyPaid,
    })
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error)
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
