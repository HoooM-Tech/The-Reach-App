import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

/**
 * Debug endpoint to check property verification status
 * GET /api/debug/property-status?id=propertyId
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('id');

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    
    const supabase = createAdminSupabaseClient();

    const { data: property, error } = await supabase
      .from('properties')
      .select('id, title, verification_status, status, developer_id')
      .eq('id', propertyId)
      .single();

    if (error || !property) {
      return NextResponse.json({ 
        error: 'Property not found',
        propertyId,
        errorDetails: error 
      }, { status: 404 });
    }

    return NextResponse.json({
      property: {
        id: property.id,
        title: property.title,
        verification_status: property.verification_status,
        status: property.status,
        isVerified: property.verification_status === 'verified',
        canBeViewedPublicly: property.verification_status === 'verified',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
