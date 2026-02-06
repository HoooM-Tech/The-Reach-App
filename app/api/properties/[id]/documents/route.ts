import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, NotFoundError } from '@/lib/utils/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    const propertyId = params.id;
    const supabase = createAdminSupabaseClient();

    const { data: property } = await supabase
      .from('properties')
      .select('id, developer_id, verification_status')
      .eq('id', propertyId)
      .single();

    if (!property) {
      throw new NotFoundError('Property');
    }

    const isDeveloperOwner = user.role === 'developer' && user.id === property.developer_id;
    const isAdmin = user.role === 'admin';
    const isVerified = property.verification_status === 'verified';
    const isBuyer = user.role === 'buyer';

    if (!isVerified && !isDeveloperOwner && !isAdmin) {
      return NextResponse.json({ documents: [] });
    }

    if (!isBuyer && !isDeveloperOwner && !isAdmin) {
      return NextResponse.json({ documents: [] });
    }

    const { data: documents } = await supabase
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
