import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/properties/count
 * Returns count of properties matching the given filters
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const propertyType = searchParams.get('property_type');
    const priceMin = searchParams.get('min_price');
    const priceMax = searchParams.get('max_price');

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified')
      .eq('status', 'active');

    if (location) {
      query = query.or(`location->>city.ilike.%${location}%,location->>state.ilike.%${location}%,location->>address.ilike.%${location}%`);
    }

    if (propertyType) {
      query = query.ilike('property_type', propertyType);
    }

    if (priceMin) {
      query = query.gte('asking_price', parseFloat(priceMin));
    }

    if (priceMax) {
      query = query.lte('asking_price', parseFloat(priceMax));
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
