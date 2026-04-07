// RSS/API ingestion layer
// Fetches content from enabled sources and returns raw items for normalization.

import Parser from 'rss-parser';
import { supabase } from '@/lib/supabase';
import type { IngestionResult } from './types';
import { normalizeArticle, isNewArticle, saveArticle } from './normalize';

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; GrowthOS-Radar/1.0)',
  },
  customFields: {
    item: ['media:content', 'content:encoded', 'dc:creator'],
  },
});

interface RawFeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  author?: string;
  'dc:creator'?: string;
  content?: string;
  'content:encoded'?: string;
  contentSnippet?: string;
  enclosure?: { url?: string };
  'media:content'?: { $?: { url?: string } };
}

export async function ingestSource(sourceId: string): Promise<IngestionResult> {
  const { data: source, error } = await supabase
    .from('radar_sources')
    .select('*')
    .eq('id', sourceId)
    .single();

  if (error || !source) {
    return { sourceName: sourceId, fetched: 0, newArticles: 0, duplicates: 0, errors: ['Source not found'] };
  }

  const result: IngestionResult = {
    sourceName: source.name,
    fetched: 0,
    newArticles: 0,
    duplicates: 0,
    errors: [],
  };

  if (!source.enabled) return result;

  if (source.type === 'rss' && source.feed_url) {
    return ingestRSSSource(source, result);
  }

  result.errors.push(`Source type "${source.type}" not yet implemented`);
  return result;
}

async function ingestRSSSource(
  source: Record<string, unknown>,
  result: IngestionResult
): Promise<IngestionResult> {
  const feedUrl = source.feed_url as string;
  const sourceId = source.id as string;
  const sourceName = source.name as string;
  const sourceCategory = source.category as string;

  try {
    const feed = await parser.parseURL(feedUrl);
    const items = (feed.items ?? []).slice(0, 30) as RawFeedItem[];
    result.fetched = items.length;

    for (const item of items) {
      if (!item.title || !item.link) continue;

      const rawContent =
        (item['content:encoded'] as string | undefined) ??
        item.content ??
        item.contentSnippet ??
        '';

      const imageUrl =
        (item.enclosure?.url) ??
        (item['media:content']?.$ as { url?: string } | undefined)?.url ??
        null;

      const normalized = normalizeArticle({
        title: item.title,
        url: item.link,
        publishedAt: item.isoDate ?? item.pubDate ?? null,
        author: item.author ?? (item['dc:creator'] as string | undefined) ?? null,
        rawContent,
        imageUrl: imageUrl ?? null,
        sourceId,
        sourceName,
        sourceCategory,
      });

      const isNew = await isNewArticle(normalized.urlHash);
      if (!isNew) {
        result.duplicates++;
        continue;
      }

      await saveArticle(normalized);
      result.newArticles++;
    }

    // Update source health
    await supabase
      .from('radar_sources')
      .update({
        last_checked_at: new Date().toISOString(),
        health_status: 'healthy',
        consecutive_failures: 0,
      })
      .eq('id', sourceId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(msg);
    console.error(`[Radar] Ingestion failed for ${sourceName}: ${msg}`);

    // Failure tracking — get current count then update
    const { data: src } = await supabase
      .from('radar_sources')
      .select('consecutive_failures')
      .eq('id', sourceId)
      .single();

    const failures = ((src?.consecutive_failures as number) ?? 0) + 1;
    await supabase
      .from('radar_sources')
      .update({
        last_checked_at: new Date().toISOString(),
        health_status: failures >= 5 ? 'failing' : failures >= 2 ? 'degraded' : 'healthy',
        consecutive_failures: failures,
      })
      .eq('id', sourceId);
  }

  return result;
}

export async function ingestAllSources(): Promise<IngestionResult[]> {
  const { data: sources, error } = await supabase
    .from('radar_sources')
    .select('id, name')
    .eq('enabled', true);

  if (error || !sources) {
    console.error('[Radar] Failed to load sources:', error);
    return [];
  }

  const results: IngestionResult[] = [];
  // Run ingestion with limited concurrency (avoid hammering sources)
  const CONCURRENCY = 5;
  for (let i = 0; i < sources.length; i += CONCURRENCY) {
    const batch = sources.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((s) => ingestSource(s.id as string)));
    results.push(...batchResults);
  }

  return results;
}

export async function seedSourcesIfEmpty(): Promise<void> {
  const { count } = await supabase
    .from('radar_sources')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 0) return;

  const { SEED_SOURCES } = await import('./seed-sources');
  const rows = SEED_SOURCES.map((s) => ({
    name: s.name,
    category: s.category,
    type: s.type,
    homepage_url: s.homepageUrl,
    feed_url: s.feedUrl ?? null,
    api_config: s.apiConfig ?? null,
    enabled: s.enabled,
    trust_score: s.trustScore,
    speed_score: s.speedScore,
    noise_score: s.noiseScore,
    notes: s.notes ?? null,
  }));

  await supabase.from('radar_sources').insert(rows);
  console.log(`[Radar] Seeded ${rows.length} sources`);
}
