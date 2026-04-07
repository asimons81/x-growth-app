// Cluster scoring engine
// Multi-factor score with configurable weights. Produces a 0–100 score
// and a structured explanation for each dimension.

import { supabase } from '@/lib/supabase';
import { getRadarSettings } from './settings';
import type { ClusterScoreBreakdown } from './types';

const MAINSTREAM_SOURCES = new Set([
  'the verge', 'techcrunch', 'wired', 'bbc', 'cnn', 'new york times',
  'washington post', 'reuters', 'bloomberg', 'the guardian', 'forbes',
  'business insider', 'the information', 'axios',
]);

const HIGH_TRUST_CATEGORIES = ['AI', 'Search', 'Big Tech'];
const ACTIONABLE_KEYWORDS = [
  'launches', 'launches', 'release', 'update', 'new feature', 'changes',
  'algorithm', 'ranking', 'penalty', 'announced', 'rolling out', 'testing',
  'deprecat', 'sunset', 'acquir', 'partner', 'integrat',
];

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

interface ClusterWithArticles {
  id: string;
  canonical_headline: string;
  canonical_summary: string | null;
  entities: string[];
  tags: string[];
  source_count: number;
  source_diversity: number;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
  articles: Array<{
    source_name: string;
    source_category: string;
    trust_score: number;
    published_at: string | null;
  }>;
}

export async function scoreCluster(clusterId: string): Promise<ClusterScoreBreakdown | null> {
  // Fetch cluster + linked articles with source trust scores
  const { data: cluster, error } = await supabase
    .from('radar_clusters')
    .select('*')
    .eq('id', clusterId)
    .single();

  if (error || !cluster) return null;

  const { data: clusterArticles } = await supabase
    .from('radar_cluster_articles')
    .select('article_id')
    .eq('cluster_id', clusterId);

  const articleIds = (clusterArticles ?? []).map((r) => r.article_id as string);

  const { data: articles } = await supabase
    .from('radar_articles')
    .select('source_name, source_category, published_at, canonical_url')
    .in('id', articleIds);

  // Get source trust/noise scores
  const sourceNames = (articles ?? []).map((a) => a.source_name as string);
  const { data: sources } = await supabase
    .from('radar_sources')
    .select('name, trust_score, noise_score, speed_score, category')
    .in('name', sourceNames);

  const sourceMap: Record<string, { trust: number; noise: number; speed: number; category: string }> = {};
  for (const s of sources ?? []) {
    sourceMap[s.name as string] = {
      trust: (s.trust_score as number) ?? 5,
      noise: (s.noise_score as number) ?? 5,
      speed: (s.speed_score as number) ?? 5,
      category: s.category as string,
    };
  }

  const settings = await getRadarSettings();
  const nicheKeywords = settings.nicheKeywords.map((k) => k.toLowerCase());

  const clusterHeadline = (cluster.canonical_headline as string).toLowerCase();
  const clusterSummary = ((cluster.canonical_summary as string) ?? '').toLowerCase();
  const clusterText = `${clusterHeadline} ${clusterSummary}`;
  const clusterEntities = (cluster.entities as string[]) ?? [];
  const clusterTags = (cluster.tags as string[]) ?? [];
  const sourceCount = (cluster.source_count as number) ?? 1;
  const sourceDiversity = (cluster.source_diversity as number) ?? 1;
  const firstSeenAt = new Date(cluster.first_seen_at as string);
  const lastSeenAt = new Date(cluster.last_seen_at as string);
  const now = new Date();

  const hoursOld = (now.getTime() - firstSeenAt.getTime()) / 3_600_000;
  const hoursSinceLastSeen = (now.getTime() - lastSeenAt.getTime()) / 3_600_000;

  const reasoning: Record<string, string> = {};

  // ── 1. Niche Relevance ────────────────────────────────────────────────────
  const nicheHits = nicheKeywords.filter((kw) => clusterText.includes(kw)).length;
  const tagNicheHits = clusterTags.filter((t) =>
    nicheKeywords.some((kw) => t.toLowerCase().includes(kw))
  ).length;
  const nicheRelevance = clamp(Math.min(100, nicheHits * 20 + tagNicheHits * 15));
  reasoning.niche_relevance = nicheHits > 0
    ? `Matched ${nicheHits} niche keywords (${nicheKeywords.filter((kw) => clusterText.includes(kw)).join(', ')})`
    : 'No direct niche keyword match';

  // ── 2. Novelty ────────────────────────────────────────────────────────────
  // High if topic hasn't appeared before recently; low if well-worn
  const novelty = clamp(hoursOld < 6 ? 95 : hoursOld < 24 ? 80 : hoursOld < 48 ? 55 : hoursOld < 72 ? 35 : 15);
  reasoning.novelty = `First seen ${hoursOld.toFixed(1)}h ago → novelty ${novelty}`;

  // ── 3. Momentum ───────────────────────────────────────────────────────────
  // Source count growth per hour in the observation window
  const observationHours = Math.max(hoursOld, 1);
  const sourcesPerHour = sourceCount / observationHours;
  let momentum = clamp(Math.min(100, sourcesPerHour * 40 + (sourceDiversity - 1) * 10));
  // Penalise if stale (last article seen > 12h ago)
  if (hoursSinceLastSeen > 12) momentum = clamp(momentum * 0.5);
  reasoning.momentum = `${sourceCount} sources over ${observationHours.toFixed(1)}h = ${sourcesPerHour.toFixed(2)}/hr; diversity=${sourceDiversity}`;

  // ── 4. Earlyness ──────────────────────────────────────────────────────────
  // We want stories before mainstream saturation
  const mainstreamCount = (articles ?? []).filter((a) =>
    MAINSTREAM_SOURCES.has((a.source_name as string).toLowerCase())
  ).length;
  let earlyness = clamp(sourceCount < 3 ? 90 : sourceCount < 6 ? 70 : sourceCount < 10 ? 50 : 30);
  if (mainstreamCount >= 3) earlyness = clamp(earlyness * 0.4);
  else if (mainstreamCount >= 1) earlyness = clamp(earlyness * 0.75);
  reasoning.earlyness = `${mainstreamCount} mainstream sources picked up; ${sourceCount} total sources`;

  // ── 5. Source Quality ─────────────────────────────────────────────────────
  const avgTrust =
    (articles ?? []).reduce((sum, a) => {
      const s = sourceMap[a.source_name as string];
      return sum + (s?.trust ?? 5);
    }, 0) / Math.max(1, (articles ?? []).length);
  const sourceQuality = clamp((avgTrust / 10) * 100);
  reasoning.source_quality = `Average trust score: ${avgTrust.toFixed(1)}/10`;

  // ── 6. Audience Fit ───────────────────────────────────────────────────────
  const audienceKeywords = ['creator', 'publisher', 'blogger', 'seo', 'content', 'search', 'wordpress', 'google'];
  const audienceHits = audienceKeywords.filter((kw) => clusterText.includes(kw)).length;
  const audienceFit = clamp(Math.min(100, audienceHits * 18));
  reasoning.audience_fit = audienceHits > 0
    ? `Audience keywords found: ${audienceKeywords.filter((kw) => clusterText.includes(kw)).join(', ')}`
    : 'Limited audience keyword match';

  // ── 7. Actionability ─────────────────────────────────────────────────────
  const actionableHits = ACTIONABLE_KEYWORDS.filter((kw) => clusterText.includes(kw.toLowerCase())).length;
  const actionability = clamp(Math.min(100, actionableHits * 20));
  reasoning.actionability = actionableHits > 0
    ? `Actionable signals found: ${ACTIONABLE_KEYWORDS.filter((kw) => clusterText.includes(kw.toLowerCase())).slice(0, 3).join(', ')}`
    : 'No strong actionable signals';

  // ── 8. Coverage Gap ───────────────────────────────────────────────────────
  // High if mostly niche sources, low if mainstream already dominant
  const nicheSourceCount = (articles ?? []).filter((a) => {
    const s = sourceMap[a.source_name as string];
    return s && HIGH_TRUST_CATEGORIES.includes(s.category) && !MAINSTREAM_SOURCES.has((a.source_name as string).toLowerCase());
  }).length;
  const coverageGap = clamp(
    mainstreamCount === 0 ? 90 : mainstreamCount === 1 ? 60 : mainstreamCount <= 3 ? 35 : 10
  );
  reasoning.coverage_gap = `${mainstreamCount} mainstream / ${nicheSourceCount} niche-authoritative sources`;

  // ── Weighted final score ──────────────────────────────────────────────────
  const w = settings.scoreWeights;
  const finalScore = clamp(
    nicheRelevance * w.niche_relevance +
    novelty * w.novelty +
    momentum * w.momentum +
    earlyness * w.earlyness +
    sourceQuality * w.source_quality +
    audienceFit * w.audience_fit +
    actionability * w.actionability +
    coverageGap * w.coverage_gap
  );

  const breakdown: ClusterScoreBreakdown = {
    finalScore,
    nicheRelevance,
    novelty,
    momentum,
    earlyness,
    sourceQuality,
    audienceFit,
    actionability,
    coverageGap,
    reasoning,
  };

  // Persist score record
  await supabase.from('radar_cluster_scores').insert({
    cluster_id: clusterId,
    final_score: finalScore,
    niche_relevance: nicheRelevance,
    novelty,
    momentum,
    earlyness,
    source_quality: sourceQuality,
    audience_fit: audienceFit,
    actionability,
    coverage_gap: coverageGap,
    reasoning,
  });

  // Update cluster's latest score
  await supabase
    .from('radar_clusters')
    .update({
      latest_score: finalScore,
      last_scored_at: new Date().toISOString(),
    })
    .eq('id', clusterId);

  return breakdown;
}

export async function scoreAllUnscoredClusters(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // scored within last 30min

  const { data: clusters } = await supabase
    .from('radar_clusters')
    .select('id')
    .in('status', ['watchlist', 'alerted'])
    .or(`last_scored_at.is.null,last_scored_at.lt.${cutoff}`);

  if (!clusters?.length) return 0;

  let scored = 0;
  for (const c of clusters) {
    await scoreCluster(c.id as string);
    scored++;
  }

  return scored;
}
