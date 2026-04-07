// Radar shared types
// These mirror the DB rows but add computed/enriched fields used at runtime.

export type SourceCategory =
  | 'AI'
  | 'Search'
  | 'SEO'
  | 'Social'
  | 'WordPress'
  | 'Publishing'
  | 'Creator Economy'
  | 'Big Tech'
  | 'Tools';

export type SourceType = 'rss' | 'api' | 'manual';
export type HealthStatus = 'healthy' | 'degraded' | 'failing' | 'unknown';
export type ClusterStatus = 'ignored' | 'watchlist' | 'alerted' | 'archived';
export type MainstreamLevel = 'none' | 'low' | 'medium' | 'high';
export type AlertType = 'early_signal' | 'high_priority' | 'watchlist_promo';
export type BriefSection = 'high_priority' | 'watchlist' | 'notes';

export interface SourceConfig {
  id?: string;
  name: string;
  category: SourceCategory;
  type: SourceType;
  homepageUrl: string;
  feedUrl?: string;
  apiConfig?: Record<string, unknown>;
  enabled: boolean;
  trustScore: number;
  speedScore: number;
  noiseScore: number;
  notes?: string;
}

export interface NormalizedArticle {
  sourceId: string;
  sourceName: string;
  sourceCategory: string;
  title: string;
  canonicalUrl: string;
  urlHash: string;
  contentHash: string;
  publishedAt: Date | null;
  fetchedAt: Date;
  author: string | null;
  excerpt: string | null;
  cleanedContent: string | null;
  imageUrl: string | null;
  language: string;
  entities: string[];
  tags: string[];
}

export interface ClusterScoreBreakdown {
  finalScore: number;
  nicheRelevance: number;
  novelty: number;
  momentum: number;
  earlyness: number;
  sourceQuality: number;
  audienceFit: number;
  actionability: number;
  coverageGap: number;
  reasoning: Record<string, string>;
}

export interface RadarSettings {
  scoreThresholds: { alert: number; watchlist: number; ignore: number };
  alertCooldownHours: number;
  scoreJumpOverride: number;
  ingestionIntervalMin: number;
  maxClusterAgeDays: number;
  nicheKeywords: string[];
  scoreWeights: {
    niche_relevance: number;
    novelty: number;
    momentum: number;
    earlyness: number;
    source_quality: number;
    audience_fit: number;
    actionability: number;
    coverage_gap: number;
  };
}

export interface AlertPayload {
  label: string;
  topic: string;
  score: number;
  reason: string;
  tags: string[];
  clusterUrl: string;
  briefUrl?: string;
}

export interface IngestionResult {
  sourceName: string;
  fetched: number;
  newArticles: number;
  duplicates: number;
  errors: string[];
}

export interface PipelineResult {
  ingestion: IngestionResult[];
  clustered: number;
  scored: number;
  alerted: number;
  briefUpdated: boolean;
  durationMs: number;
}
