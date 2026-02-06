import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/utils/auth';
import { handleError, NotFoundError, ValidationError } from '@/lib/utils/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id;
    const supabase = createAdminSupabaseClient();

    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single();

    if (!property) {
      throw new NotFoundError('Property');
    }

    const { data: notes } = await supabase
      .from('property_notes')
      .select('id, note_text, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      note: notes && notes.length > 0 ? notes[0] : null,
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser();
    if (user.role !== 'buyer') {
      throw new ValidationError('Only buyers can submit notes');
    }
    const propertyId = params.id;
    const body = await req.json();
    const noteText = String(body?.note_text || '').trim();
    if (!noteText) {
      throw new ValidationError('Note text is required');
    }

    const supabase = createAdminSupabaseClient();
    const { data: property } = await supabase
      .from('properties')
      .select('id, developer_id')
      .eq('id', propertyId)
      .single();

    if (!property) {
      throw new NotFoundError('Property');
    }

    const { data: note, error } = await supabase
      .from('property_notes')
      .insert({
        property_id: propertyId,
        developer_id: property.developer_id,
        note_text: noteText,
      })
      .select('id, note_text, created_at')
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    return NextResponse.json({ note });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
