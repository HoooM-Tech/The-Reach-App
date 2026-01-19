import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/client';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { NotFoundError, handleError } from '@/lib/utils/errors';

/**
 * GET /api/properties/[id]/details
 * 
 * Returns comprehensive property details including:
 * - Property data
 * - Media
 * - Stats (views, leads)
 * - Bids
 * - Notes (developer's notes)
 * - Inspections
 * - Contract
 * - Rejection feedback (if rejected)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthenticatedUser();
    const propertyId = params.id;
    
    const supabase = createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Get property
    const { data: property, error: propertyError } = await adminSupabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      throw new NotFoundError('Property');
    }

    // Verify user is the developer or admin
    if (currentUser.id !== property.developer_id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get property media
    const { data: media } = await adminSupabase
      .from('property_media')
      .select('*')
      .eq('property_id', propertyId)
      .order('order_index', { ascending: true });

    // Get stats (views and leads)
    const { count: leadsCount } = await adminSupabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    const { data: trackingLinks } = await adminSupabase
      .from('tracking_links')
      .select('impressions')
      .eq('property_id', propertyId);

    const viewsCount = trackingLinks?.reduce((sum, link) => sum + (link.impressions || 0), 0) || 0;

    // Get bids (highest bid)
    const { data: bids } = await adminSupabase
      .from('bids')
      .select('*')
      .eq('property_id', propertyId)
      .order('amount', { ascending: false })
      .limit(1);

    // Get developer's notes
    const { data: notes } = await adminSupabase
      .from('property_notes')
      .select('*')
      .eq('property_id', propertyId)
      .eq('developer_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1);

    // Get inspections (upcoming or most recent)
    const { data: inspections } = await adminSupabase
      .from('inspections')
      .select('*, leads(buyer_name, buyer_email, buyer_phone)')
      .eq('property_id', propertyId)
      .in('status', ['booked', 'confirmed'])
      .order('slot_time', { ascending: true })
      .limit(1);

    // Get contract
    const { data: contracts } = await adminSupabase
      .from('contracts_of_sale')
      .select('id, contract_url, terms')
      .eq('property_id', propertyId)
      .limit(1);
    
    // If contract_url doesn't exist, generate it from contract ID or terms
    let contractUrl = null;
    if (contracts && contracts.length > 0) {
      contractUrl = contracts[0].contract_url;
      // If no contract_url, we can generate one from the contract ID
      // For now, we'll use a placeholder or generate URL based on contract ID
      if (!contractUrl && contracts[0].id) {
        contractUrl = `/api/contracts/${contracts[0].id}/view`;
      }
    }

    // Get rejection feedback (if rejected)
    let rejectionFeedback = null;
    if (property.verification_status === 'rejected') {
      const { data: feedback } = await adminSupabase
        .from('property_rejection_feedback')
        .select('feedback_message')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      rejectionFeedback = feedback?.feedback_message || null;
    }

    return NextResponse.json({
      property: {
        ...property,
        media: media || [],
      },
      stats: {
        views: viewsCount,
        leads: leadsCount || 0,
      },
      bid: bids && bids.length > 0 ? {
        amount: bids[0].amount,
        id: bids[0].id,
      } : null,
      note: notes && notes.length > 0 ? {
        note_text: notes[0].note_text,
        id: notes[0].id,
      } : null,
      inspection: inspections && inspections.length > 0 ? {
        id: inspections[0].id,
        slot_time: inspections[0].slot_time,
        status: inspections[0].status,
        type: inspections[0].type || 'in_person',
        buyer_name: inspections[0].leads?.buyer_name || inspections[0].buyer_name || '',
        buyer_email: inspections[0].leads?.buyer_email || inspections[0].buyer_email || '',
        buyer_phone: inspections[0].leads?.buyer_phone || inspections[0].buyer_phone || '',
        address: inspections[0].address || property.location?.address || '',
        reminder_days: inspections[0].reminder_days || 1,
      } : null,
      contract: contracts && contracts.length > 0 ? {
        id: contracts[0].id,
        contract_url: contractUrl,
      } : null,
      rejectionFeedback,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
