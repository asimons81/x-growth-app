import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [clusterRes, articlesRes, scoresRes, eventsRes, alertsRes] = await Promise.all([
      supabase.from('radar_clusters').select('*').eq('id', id).single(),
      supabase
        .from('radar_cluster_articles')
        .select('article_id, added_at')
        .eq('cluster_id', id)
        .order('added_at', { ascending: false }),
      supabase
        .from('radar_cluster_scores')
        .select('*')
        .eq('cluster_id', id)
        .order('scored_at', { ascending: false })
        .limit(10),
      supabase
        .from('radar_cluster_events')
        .select('*')
        .eq('cluster_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('radar_alerts')
        .select('*')
        .eq('cluster_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (clusterRes.error || !clusterRes.data) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Fetch the actual articles
    const articleIds = (articlesRes.data ?? []).map((r) => r.article_id as string);
    const { data: articles } = articleIds.length
      ? await supabase
          .from('radar_articles')
          .select('id, title, canonical_url, source_name, source_category, published_at, author, excerpt')
          .in('id', articleIds)
          .order('published_at', { ascending: false })
      : { data: [] };

    return NextResponse.json({
      cluster: clusterRes.data,
      articles: articles ?? [],
      scores: scoresRes.data ?? [],
      events: eventsRes.data ?? [],
      alerts: alertsRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch cluster detail' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { status?: string; why_flagged?: string; suggested_angles?: string[] };

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) updateData.status = body.status;
  if (body.why_flagged !== undefined) updateData.why_flagged = body.why_flagged;
  if (body.suggested_angles) updateData.suggested_angles = body.suggested_angles;

  const { data, error } = await supabase
    .from('radar_clusters')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json({ data });
}
