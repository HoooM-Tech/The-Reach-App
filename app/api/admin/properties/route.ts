import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await requireAdmin();
    console.log('[Admin Properties List] Admin authenticated:', { id: admin.id, role: admin.role });
    
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('[Admin Properties List] Query params:', { status, page, limit });

    let query = adminSupabase
      .from('properties')
      .select(`
        *,
        users!properties_developer_id_fkey(full_name, email)
      `, { count: 'exact' });

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'pending_verification') {
        query = query.eq('verification_status', 'pending_verification');
      } else if (status === 'verified') {
        query = query.eq('verification_status', 'verified');
      } else if (status === 'rejected') {
        query = query.eq('verification_status', 'rejected');
      } else if (status === 'sold') {
        query = query.eq('status', 'sold');
      }
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    console.log('[Admin Properties List] Executing query...');
    const { data: properties, error, count } = await query;

    if (error) {
      console.error('[Admin Properties List] Supabase query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('[Admin Properties List] Properties fetched:', { count: properties?.length || 0, total: count });

    // Transform data
    const transformedProperties = (properties || []).map((prop: any) => ({
      id: prop.id,
      title: prop.title,
      asking_price: prop.asking_price,
      verification_status: prop.verification_status,
      status: prop.status,
      created_at: prop.created_at,
      developer: prop.users ? {
        full_name: prop.users.full_name,
        email: prop.users.email,
      } : null,
    }));

    return NextResponse.json({
      properties: transformedProperties,
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('[Admin Properties List] API Error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const { error: errorMessage, statusCode } = handleError(error);
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined,
      },
      { status: statusCode }
    );
  }
}
