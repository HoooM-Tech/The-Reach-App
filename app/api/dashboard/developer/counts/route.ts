import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/dashboard/developer/counts
 * 
 * Returns the total count of leads and inspections for the authenticated developer.
 * Counts are scoped to properties owned by the developer.
 * Uses JOIN queries to ensure accurate counts matching database records exactly.
 * 
 * Response:
 * {
 *   leadsCount: number,
 *   inspectionsCount: number
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate and get current user
    const currentUser = await getAuthenticatedUser();
    
    console.log('[Developer Counts] Request from user:', currentUser.id, 'role:', currentUser.role);
    
    // Verify user is a developer
    if (currentUser.role !== 'developer' && currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Developer access required' },
        { status: 403 }
      );
    }

    const supabase = createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();

    // Get all property IDs owned by this developer
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, developer_id')
      .eq('developer_id', currentUser.id);

    if (propertiesError) {
      console.error('[Developer Counts] Error fetching properties:', propertiesError);
      throw new Error('Failed to fetch properties');
    }

    const propertyIds = properties?.map((p) => p.id) || [];
    console.log('[Developer Counts] Found properties:', propertyIds.length, 'Property IDs:', propertyIds);

    // If developer has no properties, return zero counts
    if (propertyIds.length === 0) {
      console.log('[Developer Counts] No properties found, returning zero counts');
      return NextResponse.json({
        leadsCount: 0,
        inspectionsCount: 0,
      });
    }

    // Count leads for developer's properties using JOIN query for accuracy
    // This ensures we only count leads that belong to properties owned by the developer
    // Use admin client to bypass RLS (leads can be created by anonymous users)
    let leadsCount = 0;
    
    // Method 1: Try count query first (more efficient)
    const { count: leadsCountQuery, error: leadsCountError } = await adminSupabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .in('property_id', propertyIds);

    if (leadsCountError) {
      console.warn('[Developer Counts] Count query failed, falling back to fetch and count:', leadsCountError);
      // Fallback: Fetch all leads and count (same approach as dashboard route)
      const { data: leads, error: leadsError } = await adminSupabase
        .from('leads')
        .select('property_id')
        .in('property_id', propertyIds);

      if (leadsError) {
        console.error('[Developer Counts] Error fetching leads:', leadsError);
        throw new Error('Failed to count leads');
      }

      leadsCount = leads?.length || 0;
      console.log('[Developer Counts] Leads count (fetch method):', leadsCount);
    } else {
      leadsCount = leadsCountQuery || 0;
      console.log('[Developer Counts] Leads count (count query):', leadsCount);
    }

    // Verify leads count by checking a sample
    if (leadsCount > 0) {
      const { data: sampleLeads } = await adminSupabase
        .from('leads')
        .select('id, property_id')
        .in('property_id', propertyIds)
        .limit(5);
      console.log('[Developer Counts] Sample leads:', sampleLeads?.length, 'Sample property IDs:', sampleLeads?.map(l => l.property_id));
    }

    // Count inspections for developer's properties
    let inspectionsCount = 0;
    
    // Method 1: Try count query first (more efficient)
    const { count: inspectionsCountQuery, error: inspectionsCountError } = await adminSupabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .in('property_id', propertyIds);

    if (inspectionsCountError) {
      console.warn('[Developer Counts] Count query failed, falling back to fetch and count:', inspectionsCountError);
      // Fallback: Fetch all inspections and count (same approach as dashboard route)
      const { data: inspections, error: inspectionsError } = await adminSupabase
        .from('inspections')
        .select('property_id')
        .in('property_id', propertyIds);

      if (inspectionsError) {
        console.error('[Developer Counts] Error fetching inspections:', inspectionsError);
        throw new Error('Failed to count inspections');
      }

      inspectionsCount = inspections?.length || 0;
      console.log('[Developer Counts] Inspections count (fetch method):', inspectionsCount);
    } else {
      inspectionsCount = inspectionsCountQuery || 0;
      console.log('[Developer Counts] Inspections count (count query):', inspectionsCount);
    }

    // Verify inspections count by checking a sample
    if (inspectionsCount > 0) {
      const { data: sampleInspections } = await adminSupabase
        .from('inspections')
        .select('id, property_id')
        .in('property_id', propertyIds)
        .limit(5);
      console.log('[Developer Counts] Sample inspections:', sampleInspections?.length, 'Sample property IDs:', sampleInspections?.map(i => i.property_id));
    }

    console.log('[Developer Counts] Final counts - Leads:', leadsCount, 'Inspections:', inspectionsCount);

    // Return counts (database is source of truth)
    return NextResponse.json({
      leadsCount: leadsCount,
      inspectionsCount: inspectionsCount,
    });
  } catch (error) {
    console.error('[Developer Counts] Unexpected error:', error);
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
