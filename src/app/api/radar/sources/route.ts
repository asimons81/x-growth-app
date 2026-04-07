import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { seedSourcesIfEmpty } from '@/lib/radar/ingestion';

export async function GET() {
  await seedSourcesIfEmpty();

  const { data, error } = await supabase
    .from('radar_sources')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabase
    .from('radar_sources')
    .insert({
      name: body.name,
      category: body.category,
      type: body.type ?? 'rss',
      homepage_url: body.homepageUrl,
      feed_url: body.feedUrl ?? null,
      enabled: body.enabled ?? true,
      trust_score: body.trustScore ?? 5,
      speed_score: body.speedScore ?? 5,
      noise_score: body.noiseScore ?? 5,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json() as { id: string; [key: string]: unknown };
  const { id, ...updates } = body;

  const mapped: Record<string, unknown> = {};
  if ('enabled' in updates) mapped.enabled = updates.enabled;
  if ('trustScore' in updates) mapped.trust_score = updates.trustScore;
  if ('speedScore' in updates) mapped.speed_score = updates.speedScore;
  if ('noiseScore' in updates) mapped.noise_score = updates.noiseScore;
  if ('notes' in updates) mapped.notes = updates.notes;

  const { data, error } = await supabase
    .from('radar_sources')
    .update(mapped)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json({ data });
}
