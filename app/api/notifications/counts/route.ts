import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';
import { normalizeNigerianPhone } from '@/lib/utils/phone';
import { parseTimestamp } from '@/lib/utils/time';

/**
 * GET /api/notifications/counts
 * Returns badge counts for various notification types
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const supabase = createAdminSupabaseClient();

    // Get unread notification count
    const { count: notificationCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    // Get upcoming inspection count (match buyer_id OR lead-based inspections)
    const { data: allLeads } = await supabase
      .from('leads')
      .select('id, buyer_email, buyer_phone')
      .order('created_at', { ascending: false });

    const userEmail = user.email?.toLowerCase();
    const userPhone = user.phone;
    let normalizedUserPhone: string | null = null;
    if (userPhone) {
      try {
        normalizedUserPhone = normalizeNigerianPhone(userPhone);
      } catch {
        // Invalid phone, skip matching by phone
      }
    }

    const matchingLeadIds = (allLeads || [])
      .filter((lead: any) => {
        if (userEmail && lead.buyer_email?.toLowerCase() === userEmail) {
          return true;
        }
        if (normalizedUserPhone && lead.buyer_phone) {
          let normalizedLeadPhone: string;
          try {
            normalizedLeadPhone = normalizeNigerianPhone(lead.buyer_phone);
          } catch {
            return false;
          }
          return normalizedLeadPhone === normalizedUserPhone;
        }
        return false;
      })
      .map((lead: any) => lead.id);

    const { data: inspectionsByBuyerId } = await supabase
      .from('inspections')
      .select('id, slot_time, status')
      .eq('buyer_id', user.id);

    let inspectionsByLead: any[] = [];
    if (matchingLeadIds.length > 0) {
      const { data: inspectionsData } = await supabase
        .from('inspections')
        .select('id, slot_time, status, lead_id')
        .in('lead_id', matchingLeadIds);
      inspectionsByLead = inspectionsData || [];
    }

    const allInspections = [
      ...(inspectionsByBuyerId || []),
      ...inspectionsByLead,
    ];

    const uniqueInspections = allInspections.filter((inspection: any, index: number, self: any[]) =>
      self.findIndex((i: any) => i.id === inspection.id) === index
    );

    const now = new Date();
    const inspectionCount = uniqueInspections.filter((i: any) => {
      if (!i?.slot_time) return false;
      const slotDate = parseTimestamp(i.slot_time);
      return slotDate.getTime() > now.getTime() && i.status !== 'cancelled';
    }).length;

    // Get pending handover count (all non-completed statuses)
    const { count: handoverCount } = await supabase
      .from('handovers')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .not('status', 'eq', 'completed');

    return NextResponse.json({
      inspections: inspectionCount || 0,
      handovers: handoverCount || 0,
      notifications: notificationCount || 0,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
