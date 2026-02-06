import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const resolvedParams = await Promise.resolve(params);
    const propertyId = resolvedParams.id;

    // Get property with developer info
    const { data: property, error: propertyError } = await adminSupabase
      .from('properties')
      .select(`
        *,
        users!properties_developer_id_fkey(full_name, email)
      `)
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Get documents
    const { data: documents } = await adminSupabase
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId);

    // Get media
    const { data: media } = await adminSupabase
      .from('property_media')
      .select('*')
      .eq('property_id', propertyId)
      .order('order_index', { ascending: true });

    return NextResponse.json({
      property: {
        id: property.id,
        title: property.title,
        description: property.description,
        asking_price: property.asking_price,
        verification_status: property.verification_status,
        status: property.status,
        developer: property.users ? {
          full_name: property.users.full_name,
          email: property.users.email,
        } : null,
        documents: documents || [],
        media: media || [],
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
