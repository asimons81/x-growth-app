-- ============================================================
-- CORE SCHEMA — x-growth-app database migration
-- Run this in your Supabase SQL editor or via psql
-- Project: lizykjgwklaesjxabvps
-- ============================================================

-- 1. Users (extends Clerk auth)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Posts: manual + AI generated
CREATE TABLE IF NOT EXISTS posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL,
  source          TEXT NOT NULL,        -- 'manual', 'ai_generated', 'repurposed', 'imported'
  status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'scheduled', 'ready', 'posted', 'archived'
  posted_at       TIMESTAMPTZ,
  impressions     INTEGER DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  replies         INTEGER DEFAULT 0,
  retweets        INTEGER DEFAULT 0,
  algorithm_score JSONB,               -- { hook, clarity, novelty, cta, readability, overall }
  topics          TEXT[],
  hooks           TEXT[],
  sentiment       TEXT,
  word_count      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

-- 3. Post variants (repurposed content)
CREATE TABLE IF NOT EXISTS post_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  variant_content   TEXT NOT NULL,
  variant_type      TEXT NOT NULL,      -- 'short', 'thread', 'quote', 'reply'
  algorithm_score   JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS post_variants_original_post_id_idx ON post_variants(original_post_id);

-- 4. Schedule queue
CREATE TABLE IF NOT EXISTS schedule_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status        TEXT DEFAULT 'pending',  -- 'pending', 'completed', 'failed'
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedule_queue_user_id_idx ON schedule_queue(user_id);
CREATE INDEX IF NOT EXISTS schedule_queue_scheduled_for_idx ON schedule_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS schedule_queue_status_idx ON schedule_queue(status);

-- 5. Ideas / Brain dumps
CREATE TABLE IF NOT EXISTS ideas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content          TEXT NOT NULL,
  expanded_content TEXT,
  status           TEXT DEFAULT 'raw',  -- 'raw', 'expanded', 'posted'
  topics           TEXT[],
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ideas_user_id_idx ON ideas(user_id);
CREATE INDEX IF NOT EXISTS ideas_status_idx ON ideas(status);

-- 6. Topics library
CREATE TABLE IF NOT EXISTS topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  topic       TEXT NOT NULL,
  frequency   INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS topics_user_id_idx ON topics(user_id);
CREATE INDEX IF NOT EXISTS topics_topic_idx ON topics(topic);

-- 7. Hooks library
CREATE TABLE IF NOT EXISTS hooks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  hook_text        TEXT NOT NULL,
  hook_type        TEXT,               -- 'question', 'statement', 'controversy', 'stat', 'curiosity', 'pain'
  performance_score INTEGER,
  used_count       INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hooks_user_id_idx ON hooks(user_id);

-- 8. Target accounts
CREATE TABLE IF NOT EXISTS target_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  x_handle    TEXT NOT NULL,
  niche       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS target_accounts_user_id_idx ON target_accounts(user_id);

-- 9. Voice profile (style extraction)
CREATE TABLE IF NOT EXISTS voice_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  common_words    TEXT[],
  sentence_starts TEXT[],
  tone_keywords   TEXT[],
  cta_patterns    TEXT[],
  formality_score INTEGER,             -- 1-10
  avg_post_length INTEGER,
  sample_posts    TEXT[],
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Daily metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date         TIMESTAMPTZ NOT NULL,
  posts_count  INTEGER DEFAULT 0,
  followers    INTEGER,
  impressions  INTEGER,
  engagements  INTEGER,
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS daily_metrics_user_id_idx ON daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS daily_metrics_date_idx ON daily_metrics(date DESC);

-- 11. User API keys (encrypted storage for settings page)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider     TEXT NOT NULL,           -- 'openai', 'google', 'x', etc
  encrypted_key TEXT NOT NULL,
  label        TEXT,                   -- user-friendly label
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_api_keys_user_id_idx ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS user_api_keys_provider_idx ON user_api_keys(provider);

-- ============================================================
-- Done. All 11 core tables created.
-- Radar tables were created separately in 20240406_radar.sql
-- ============================================================
