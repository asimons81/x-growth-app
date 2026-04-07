import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');
  const limit = parseInt(searchParams.get('limit') ?? '14');

  if (date) {
    const { data: brief, error } = await supabase
      .from('radar_daily_briefs')
      .select('*')
      .eq('date', date)
      .single();

    if (error) return NextResponse.json({ error: 'Brief not found' }, { status: 404 });

    const { data: entries } = await supabase
      .from('radar_brief_entries')
      .select('*, radar_clusters(canonical_headline, tags, entities, latest_score)')
      .eq('brief_id', brief.id)
      .order('score', { ascending: false });

    return NextResponse.json({ brief, entries });
  }

  const { data, error } = await supabase
    .from('radar_daily_briefs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
  return NextResponse.json({ data });
}
