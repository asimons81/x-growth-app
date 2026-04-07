import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status'); // 'watchlist','alerted','ignored','archived'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    let query = supabase
      .from('radar_clusters')
      .select('*', { count: 'exact' })
      .order('latest_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['watchlist', 'alerted']);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, count });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch clusters' }, { status: 500 });
  }
}
