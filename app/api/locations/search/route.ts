import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/client';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const supabase = createAdminSupabaseClient();

    // Get unique locations from properties
    const { data: properties, error } = await supabase
      .from('properties')
      .select('location')
      .eq('verification_status', 'verified')
      .eq('status', 'active')
      .not('location', 'is', null);

    if (error) {
      throw new Error(error.message);
    }

    // Extract and deduplicate locations
    const locations = new Set<string>();
    
    properties?.forEach((property: any) => {
      const loc = property.location;
      if (loc) {
        // Try different location formats
        if (loc.address) {
          locations.add(loc.address);
        }
        if (loc.city && loc.state) {
          locations.add(`${loc.city}, ${loc.state}`);
        }
        if (loc.city) {
          locations.add(loc.city);
        }
        if (loc.state) {
          locations.add(loc.state);
        }
      }
    });

    // Filter by query and return top 5 matches
    const suggestions = Array.from(locations)
      .filter(loc => loc.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    return NextResponse.json({ suggestions });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
