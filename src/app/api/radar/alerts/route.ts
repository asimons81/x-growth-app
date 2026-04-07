import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100);

  const { data, error } = await supabase
    .from('radar_alerts')
    .select('*, radar_clusters(canonical_headline, latest_score, tags, status)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  return NextResponse.json({ data });
}
