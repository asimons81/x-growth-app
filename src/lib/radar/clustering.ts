// Topic clustering
// Groups articles discussing the same story into clusters using lexical similarity.
// No external embeddings API needed — Jaccard on token sets + entity overlap.

import { supabase } from '@/lib/supabase';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'its', 'it', 'this',
  'that', 'these', 'those', 'new', 'says', 'said', 'report', 'update',
  'via', 'now', 'just', 'more', 'how', 'why', 'what', 'when', 'where',
  'about', 'out', 'up', 'into', 'over', 'after', 'before', 'their',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function entityOverlap(entitiesA: string[], entitiesB: string[]): number {
  if (!entitiesA.length || !entitiesB.length) return 0;
  const setA = new Set(entitiesA.map((e) => e.toLowerCase()));
  const setB = new Set(entitiesB.map((e) => e.toLowerCase()));
  const intersection = [...setA].filter((e) => setB.has(e)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function articlesAreSameStory(
  titleA: string,
  titleB: string,
  entitiesA: string[],
  entitiesB: string[]
): boolean {
  const tokA = tokenize(titleA);
  const tokB = tokenize(titleB);
  const titleSim = jaccardSimilarity(tokA, tokB);
  const entitySim = entityOverlap(entitiesA, entitiesB);

  // Stories are the same if:
  // - high title similarity alone (0.45+), OR
  // - moderate title sim + entity overlap (0.25 + 0.3)
  return titleSim >= 0.45 || (titleSim >= 0.25 && entitySim >= 0.30);
}

interface ArticleRow {
  id: string;
  title: string;
  entities: string[];
  source_name: string;
  source_category: string;
  published_at: string | null;
  excerpt: string | null;
  canonical_url: string;
}

interface ClusterRow {
  id: string;
  canonical_headline: string;
  entities: string[];
  tags: string[];
}

export async function clusterNewArticles(): Promise<number> {
  // Only process unclustered articles from the last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabase
    .from('radar_articles')
    .select('id, title, entities, source_name, source_category, published_at, excerpt, canonical_url')
    .is('cluster_id', null)
    .eq('is_duplicate', false)
    .gte('fetched_at', cutoff)
    .order('fetched_at', { ascending: true });

  if (error || !articles?.length) return 0;

  // Load existing active clusters for comparison
  const { data: existingClusters } = await supabase
    .from('radar_clusters')
    .select('id, canonical_headline, entities, tags')
    .in('status', ['watchlist', 'alerted'])
    .gte('last_seen_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const clusters: ClusterRow[] = (existingClusters ?? []) as ClusterRow[];

  let clusteredCount = 0;

  for (const article of articles as ArticleRow[]) {
    const assigned = await tryAssignToExistingCluster(article, clusters);
    if (!assigned) {
      const newClusterId = await createClusterFromArticle(article);
      if (newClusterId) {
        clusters.push({
          id: newClusterId,
          canonical_headline: article.title,
          entities: article.entities ?? [],
          tags: [],
        });
      }
    }
    clusteredCount++;
  }

  return clusteredCount;
}

async function tryAssignToExistingCluster(
  article: ArticleRow,
  clusters: ClusterRow[]
): Promise<boolean> {
  for (const cluster of clusters) {
    const same = articlesAreSameStory(
      article.title,
      cluster.canonical_headline,
      article.entities ?? [],
      cluster.entities ?? []
    );

    if (!same) continue;

    // Assign article to this cluster
    const { error: joinErr } = await supabase
      .from('radar_cluster_articles')
      .insert({ cluster_id: cluster.id, article_id: article.id })
      .select()
      .maybeSingle();

    if (joinErr && joinErr.code !== '23505') continue; // skip on conflict

    // Update article's cluster_id
    await supabase
      .from('radar_articles')
      .update({ cluster_id: cluster.id })
      .eq('id', article.id);

    // Update cluster metadata
    await updateClusterMetadata(cluster.id, article);

    // Record event
    await supabase.from('radar_cluster_events').insert({
      cluster_id: cluster.id,
      event_type: 'source_added',
      metadata: {
        article_id: article.id,
        source_name: article.source_name,
        source_category: article.source_category,
      },
    });

    return true;
  }

  return false;
}

async function updateClusterMetadata(clusterId: string, article: ArticleRow): Promise<void> {
  // Get current source count and categories
  const { data: clusterArticles } = await supabase
    .from('radar_cluster_articles')
    .select('article_id')
    .eq('cluster_id', clusterId);

  const articleIds = (clusterArticles ?? []).map((r) => r.article_id as string);

  const { data: sources } = await supabase
    .from('radar_articles')
    .select('source_name, source_category')
    .in('id', articleIds);

  const uniqueCategories = new Set((sources ?? []).map((s) => s.source_category as string));

  await supabase
    .from('radar_clusters')
    .update({
      source_count: articleIds.length,
      source_diversity: uniqueCategories.size,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clusterId);
}

async function createClusterFromArticle(article: ArticleRow): Promise<string | null> {
  const { data: cluster, error } = await supabase
    .from('radar_clusters')
    .insert({
      canonical_headline: article.title,
      canonical_summary: article.excerpt ?? null,
      status: 'watchlist',
      entities: article.entities ?? [],
      tags: [],
      source_count: 1,
      source_diversity: 1,
      mainstream_pickup_level: 'none',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !cluster) {
    console.error('[Radar] createCluster error:', error?.message);
    return null;
  }

  const clusterId = cluster.id as string;

  // Link article to cluster
  await supabase
    .from('radar_cluster_articles')
    .insert({ cluster_id: clusterId, article_id: article.id });

  await supabase
    .from('radar_articles')
    .update({ cluster_id: clusterId })
    .eq('id', article.id);

  // Record first_seen event
  await supabase.from('radar_cluster_events').insert({
    cluster_id: clusterId,
    event_type: 'first_seen',
    new_status: 'watchlist',
    metadata: {
      article_id: article.id,
      source_name: article.source_name,
      headline: article.title,
    },
  });

  return clusterId;
}
