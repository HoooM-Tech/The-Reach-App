import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { NotFoundError, ValidationError, handleError } from '@/lib/utils/errors';
import { notificationHelpers } from '@/lib/services/notification-helper';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser();
    const inspectionId = params.id;
    const body = await req.json();
    
    const { slot_time, type, buyer_name, buyer_email, buyer_phone } = body;

    if (!slot_time) {
      throw new ValidationError('Slot time is required');
    }

    const supabase = createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Get inspection with property and buyer info
    const { data: inspection, error: inspectionError } = await adminSupabase
      .from('inspections')
      .select('*, properties(developer_id, title), leads(buyer_name, buyer_email, buyer_phone)')
      .eq('id', inspectionId)
      .single();

    if (inspectionError || !inspection) {
      throw new NotFoundError('Inspection');
    }

    // Store old slot time for notification
    const oldSlotTime = inspection.slot_time;

    // Verify user is the developer
    if (currentUser.id !== inspection.properties?.developer_id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if new slot is available
    const { data: existingBookings } = await adminSupabase
      .from('inspections')
      .select('id')
      .eq('property_id', inspection.property_id)
      .eq('slot_time', slot_time)
      .in('status', ['booked', 'confirmed'])
      .neq('id', inspectionId);

    if (existingBookings && existingBookings.length > 0) {
      throw new ValidationError('This time slot is already booked');
    }

    // Update inspection
    const updateData: any = {
      slot_time: slot_time,
      updated_at: new Date().toISOString(),
    };

    if (type) {
      updateData.type = type;
    }

    // Update lead if buyer info is provided
    if (inspection.lead_id && (buyer_name || buyer_email || buyer_phone)) {
      const leadUpdate: any = {};
      if (buyer_name) leadUpdate.buyer_name = buyer_name;
      if (buyer_email) leadUpdate.buyer_email = buyer_email;
      if (buyer_phone) leadUpdate.buyer_phone = buyer_phone;

      if (Object.keys(leadUpdate).length > 0) {
        await adminSupabase
          .from('leads')
          .update(leadUpdate)
          .eq('id', inspection.lead_id);
      }
    }

    const { data: updatedInspection, error: updateError } = await adminSupabase
      .from('inspections')
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to reschedule inspection');
    }

    // Notify buyer about reschedule
    try {
      const property = inspection.properties as any;
      const lead = inspection.leads as any;
      
      // Get buyer_id from inspection or try to find by phone/email
      let buyerId = inspection.buyer_id;
      
      // If no buyer_id, try to find buyer by phone or email
      if (!buyerId && (lead?.buyer_phone || lead?.buyer_email)) {
        const { data: buyers } = await adminSupabase
          .from('users')
          .select('id')
          .eq('role', 'buyer')
          .or(
            lead?.buyer_phone ? `phone.eq.${lead.buyer_phone}` : undefined,
            lead?.buyer_email ? `email.eq.${lead.buyer_email}` : undefined
          )
          .limit(1);
        
        if (buyers && buyers.length > 0) {
          buyerId = buyers[0].id;
        }
      }

      if (buyerId && property?.title) {
        await notificationHelpers.inspectionRescheduled({
          developerId: currentUser.id,
          buyerId: buyerId,
          propertyId: inspection.property_id,
          propertyTitle: property.title,
          inspectionId: inspectionId,
          oldSlotTime: oldSlotTime,
          newSlotTime: slot_time,
          buyerName: lead?.buyer_name || inspection.buyer_name,
          buyerPhone: lead?.buyer_phone || inspection.buyer_phone,
        });
      }
    } catch (notifError) {
      // Don't fail the reschedule if notification fails
      console.error('Failed to send reschedule notification:', notifError);
    }

    return NextResponse.json({
      message: 'Inspection rescheduled successfully',
      inspection: updatedInspection,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
