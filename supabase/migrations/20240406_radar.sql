-- ============================================================
-- RADAR module — database migration
-- Run this in your Supabase SQL editor or via psql
-- ============================================================

-- 1. Monitored sources
CREATE TABLE IF NOT EXISTS radar_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,        -- 'AI','Search','SEO','Social','WordPress','Publishing','Creator Economy','Big Tech','Tools'
  type            TEXT NOT NULL,        -- 'rss','api','manual'
  homepage_url    TEXT NOT NULL,
  feed_url        TEXT,
  api_config      JSONB,
  enabled         BOOLEAN DEFAULT TRUE,
  trust_score     INTEGER DEFAULT 5,    -- 1-10
  speed_score     INTEGER DEFAULT 5,    -- 1-10
  noise_score     INTEGER DEFAULT 5,    -- 1-10
  notes           TEXT,
  last_checked_at TIMESTAMPTZ,
  health_status   TEXT DEFAULT 'unknown',
  consecutive_failures INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Normalised incoming articles
CREATE TABLE IF NOT EXISTS radar_articles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        UUID REFERENCES radar_sources(id) ON DELETE SET NULL,
  source_name      TEXT NOT NULL,
  source_category  TEXT,
  title            TEXT NOT NULL,
  canonical_url    TEXT NOT NULL,
  url_hash         TEXT NOT NULL,       -- SHA-256 of normalised URL
  content_hash     TEXT,               -- SHA-256 of title+excerpt
  published_at     TIMESTAMPTZ,
  fetched_at       TIMESTAMPTZ DEFAULT NOW(),
  author           TEXT,
  excerpt          TEXT,
  cleaned_content  TEXT,
  image_url        TEXT,
  language         TEXT DEFAULT 'en',
  entities         TEXT[],
  tags             TEXT[],
  is_duplicate     BOOLEAN DEFAULT FALSE,
  cluster_id       UUID,               -- set after clustering
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS radar_articles_url_hash_idx ON radar_articles(url_hash);
CREATE INDEX IF NOT EXISTS radar_articles_cluster_id_idx ON radar_articles(cluster_id);
CREATE INDEX IF NOT EXISTS radar_articles_published_at_idx ON radar_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS radar_articles_source_id_idx ON radar_articles(source_id);

-- 3. Topic-level clusters
CREATE TABLE IF NOT EXISTS radar_clusters (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_headline      TEXT NOT NULL,
  canonical_summary       TEXT,
  status                  TEXT DEFAULT 'watchlist', -- 'ignored','watchlist','alerted','archived'
  tags                    TEXT[],
  entities                TEXT[],
  why_flagged             TEXT,
  suggested_angles        TEXT[],
  source_count            INTEGER DEFAULT 1,
  source_diversity        INTEGER DEFAULT 1,
  mainstream_pickup_level TEXT DEFAULT 'none',      -- 'none','low','medium','high'
  first_seen_at           TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at            TIMESTAMPTZ DEFAULT NOW(),
  last_scored_at          TIMESTAMPTZ,
  last_alerted_at         TIMESTAMPTZ,
  latest_score            INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS radar_clusters_status_idx ON radar_clusters(status);
CREATE INDEX IF NOT EXISTS radar_clusters_latest_score_idx ON radar_clusters(latest_score DESC);
CREATE INDEX IF NOT EXISTS radar_clusters_first_seen_at_idx ON radar_clusters(first_seen_at DESC);

-- 4. Join table: articles ↔ clusters
CREATE TABLE IF NOT EXISTS radar_cluster_articles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES radar_clusters(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES radar_articles(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cluster_id, article_id)
);

CREATE INDEX IF NOT EXISTS radar_cluster_articles_cluster_idx ON radar_cluster_articles(cluster_id);

-- 5. Score history
CREATE TABLE IF NOT EXISTS radar_cluster_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      UUID NOT NULL REFERENCES radar_clusters(id) ON DELETE CASCADE,
  final_score     INTEGER NOT NULL,
  niche_relevance INTEGER,
  novelty         INTEGER,
  momentum        INTEGER,
  earlyness       INTEGER,
  source_quality  INTEGER,
  audience_fit    INTEGER,
  actionability   INTEGER,
  coverage_gap    INTEGER,
  reasoning       JSONB,
  scored_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS radar_cluster_scores_cluster_idx ON radar_cluster_scores(cluster_id);
CREATE INDEX IF NOT EXISTS radar_cluster_scores_scored_at_idx ON radar_cluster_scores(scored_at DESC);

-- 6. State transition events
CREATE TABLE IF NOT EXISTS radar_cluster_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      UUID NOT NULL REFERENCES radar_clusters(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  previous_status TEXT,
  new_status      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS radar_cluster_events_cluster_idx ON radar_cluster_events(cluster_id);
CREATE INDEX IF NOT EXISTS radar_cluster_events_created_at_idx ON radar_cluster_events(created_at DESC);

-- 7. Discord alert log
CREATE TABLE IF NOT EXISTS radar_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      UUID NOT NULL REFERENCES radar_clusters(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL,
  score           INTEGER NOT NULL,
  payload         JSONB,
  discord_sent    BOOLEAN DEFAULT FALSE,
  discord_sent_at TIMESTAMPTZ,
  discord_error   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS radar_alerts_cluster_idx ON radar_alerts(cluster_id);
CREATE INDEX IF NOT EXISTS radar_alerts_created_at_idx ON radar_alerts(created_at DESC);

-- 8. Daily briefs
CREATE TABLE IF NOT EXISTS radar_daily_briefs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date           TEXT NOT NULL UNIQUE,   -- YYYY-MM-DD
  google_doc_id  TEXT,
  google_doc_url TEXT,
  entry_count    INTEGER DEFAULT 0,
  status         TEXT DEFAULT 'draft',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Brief entries
CREATE TABLE IF NOT EXISTS radar_brief_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id        UUID NOT NULL REFERENCES radar_daily_briefs(id) ON DELETE CASCADE,
  cluster_id      UUID NOT NULL REFERENCES radar_clusters(id) ON DELETE CASCADE,
  section         TEXT NOT NULL,           -- 'high_priority','watchlist','notes'
  score           INTEGER NOT NULL,
  why_flagged     TEXT,
  what_happened   TEXT,
  why_it_matters  TEXT,
  suggested_angle TEXT,
  source_links    TEXT[],
  added_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS radar_brief_entries_brief_idx ON radar_brief_entries(brief_id);

-- 10. Settings key-value store
CREATE TABLE IF NOT EXISTS radar_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO radar_settings (key, value, description) VALUES
  ('score_thresholds',       '{"alert": 72, "watchlist": 45, "ignore": 20}',                            'Score cutoffs for state transitions'),
  ('alert_cooldown_hours',   '6',                                                                        'Min hours between repeat alerts for same cluster'),
  ('score_jump_override',    '15',                                                                       'Score increase that overrides cooldown window'),
  ('ingestion_interval_min', '10',                                                                       'Fetch interval in minutes'),
  ('max_cluster_age_days',   '7',                                                                        'Auto-archive clusters older than N days with no new sources'),
  ('niche_keywords',         '["AI","SEO","search","content","creator","WordPress","Google","publish"]', 'Keywords that boost niche_relevance score'),
  ('score_weights',          '{"niche_relevance":0.24,"novelty":0.18,"momentum":0.16,"earlyness":0.14,"source_quality":0.10,"audience_fit":0.08,"actionability":0.06,"coverage_gap":0.04}', 'Score dimension weights')
ON CONFLICT (key) DO NOTHING;
