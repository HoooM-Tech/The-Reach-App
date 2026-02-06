import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    let query = adminSupabase
      .from('disputes')
      .select(`
        *,
        complainant:users!disputes_complainant_id_fkey(full_name, email),
        respondent:users!disputes_respondent_id_fkey(full_name, email)
      `, { count: 'exact' });

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by priority
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: disputes, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data
    const transformedDisputes = (disputes || []).map((dispute: any) => ({
      id: dispute.id,
      title: dispute.title,
      type: dispute.type,
      priority: dispute.priority,
      status: dispute.status,
      created_at: dispute.created_at,
      complainant: dispute.complainant ? {
        full_name: dispute.complainant.full_name,
        email: dispute.complainant.email,
      } : null,
      respondent: dispute.respondent ? {
        full_name: dispute.respondent.full_name,
        email: dispute.respondent.email,
      } : null,
    }));

    return NextResponse.json({
      disputes: transformedDisputes,
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleError(error);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
