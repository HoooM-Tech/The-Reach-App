import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/utils/auth';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const adminSupabase = createAdminSupabaseClient();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    let query = adminSupabase
      .from('users')
      .select('*', { count: 'exact' });

    // Filter by type
    if (type && type !== 'all') {
      if (type === 'developers') {
        query = query.eq('role', 'developer');
      } else if (type === 'creators') {
        query = query.eq('role', 'creator');
      } else if (type === 'buyers') {
        query = query.eq('role', 'buyer');
      } else if (type === 'pending') {
        query = query.eq('kyc_status', 'pending');
      }
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('kyc_status', status);
    }

    // Search
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get additional counts for each user
    const usersWithCounts = await Promise.all(
      (users || []).map(async (user) => {
        if (user.role === 'developer') {
          const { count: propertiesCount } = await adminSupabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('developer_id', user.id);
          return { ...user, properties_count: propertiesCount || 0 };
        } else if (user.role === 'creator') {
          const { count: promotionsCount } = await adminSupabase
            .from('tracking_links')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', user.id);
          return { ...user, promotions_count: promotionsCount || 0 };
        }
        return user;
      })
    );

    return NextResponse.json({
      users: usersWithCounts,
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
