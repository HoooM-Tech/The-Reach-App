import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/properties/types
 * Returns available property types from the database
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();

    // Get unique property types from verified properties
    const { data: properties, error } = await supabase
      .from('properties')
      .select('property_type')
      .eq('verification_status', 'verified')
      .eq('status', 'active')
      .not('property_type', 'is', null);

    if (error) {
      throw new Error(error.message);
    }

    // Extract unique property types
    const typesSet = new Set<string>();
    properties?.forEach((p: any) => {
      if (p.property_type) {
        typesSet.add(p.property_type);
      }
    });

    // Default property types if none found
    const defaultTypes = [
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
      { value: 'duplex', label: 'Duplex' },
      { value: 'penthouse', label: 'Penthouse' },
      { value: 'studio', label: 'Studio' },
      { value: 'villa', label: 'Villa' },
      { value: 'bungalow', label: 'Bungalow' },
      { value: 'townhouse', label: 'Townhouse' },
      { value: 'land', label: 'Land' },
      { value: 'commercial', label: 'Commercial' },
    ];

    // If we have types from DB, format them
    const types = typesSet.size > 0
      ? Array.from(typesSet).map(type => ({
          value: type.toLowerCase(),
          label: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
        }))
      : defaultTypes;

    return NextResponse.json({ types });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
