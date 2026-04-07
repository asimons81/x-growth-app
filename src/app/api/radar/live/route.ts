import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200);
  const category = searchParams.get('category');

  let query = supabase
    .from('radar_articles')
    .select('id, title, canonical_url, source_name, source_category, published_at, fetched_at, author, excerpt, tags, cluster_id, is_duplicate', { count: 'exact' })
    .eq('is_duplicate', false)
    .order('fetched_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('source_category', category);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });

  return NextResponse.json({ data, count });
}
