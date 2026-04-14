# X Growth App

An all-in-one X (Twitter) content operating system — built for organic growth.

**Stack:** Next.js 16 · Supabase · Tailwind CSS · shadcn/ui

---

## What it does

The app is a personal content OS for growing on X. It combines content intelligence (Radar), AI-powered content generation, and a full publishing workflow — all in one place.

### Radar
- Monitors topics for early-significant signals before they go mainstream
- Clusters articles by topic across multiple RSS/API sources
- Scores topics on novelty, momentum, audience fit, and actionability
- Fires alerts when high-priority clusters emerge
- Generates daily briefs (optionally exported to Google Docs)

### Content OS
- **Compose** — AI draft generation using your voice profile
- **Hooks** — Hook library with performance tracking
- **Ideas** — Brain dump + AI expansion
- **Analytics** — Track your post performance
- **Schedule** — Queue posts with optimal timing
- **Repurpose** — Convert one post into multiple formats (short, thread, quote, reply)
- **Library** — All your drafts, hooks, ideas, and topics in one place

### Integrations
- **BYOK AI** — Bring your own API key for any provider: Google Gemini, OpenAI, Anthropic, Ollama (local), or MiniMax (Hailuo)
- **CSV Import** — Upload your X analytics or post history
- **OpenCLI** — Pulls live X data (profile, followers, likes, trending) via browser automation
- **Discord Alerts** — Radar alerts delivered to your Discord server
- **Google Docs** — Daily briefs auto-exported to Google Docs

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/asimons81/x-growth-app
cd x-growth-app
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. Set up the database

Run the migrations in your Supabase SQL editor:

```bash
# Radar tables
supabase/migrations/20240406_radar.sql

# Content tables (users, posts, daily_metrics, etc.)
# Run the content migration from the Supabase dashboard SQL editor
```

### 4. Configure AI providers

Navigate to `/settings` and add your API keys. Supported providers:
- Google Gemini (default)
- OpenAI (GPT-4o)
- Anthropic (Claude)
- Ollama (local models)
- MiniMax (Hailuo API)

### 5. Run

```bash
npm run dev
```

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/          # AI generation endpoints
│   │   ├── import/      # CSV import
│   │   ├── radar/       # Radar pipeline, clusters, alerts
│   │   ├── settings/     # Key management
│   │   └── x-analytics/ # OpenCLI X data fetching
│   ├── dashboard/        # Main dashboard
│   ├── compose/          # AI compose
│   ├── hooks/            # Hook library
│   ├── ideas/            # Ideas / brain dump
│   ├── radar/            # Radar overview + clusters
│   ├── schedule/         # Post scheduling
│   ├── library/          # Content library
│   └── settings/         # Settings page
├── lib/
│   ├── ai-providers.ts  # Multi-provider AI abstraction
│   ├── radar/           # Radar pipeline (ingestion, scoring, clustering)
│   └── db/schema.ts     # Drizzle ORM schema
└── components/ui/        # shadcn/ui components
```

---

## Key files

- `src/lib/ai-providers.ts` — Provider abstraction (OpenAI, Anthropic, Gemini, Ollama, MiniMax)
- `src/lib/ai.ts` — AI service (voice extraction, draft generation, scoring, repurposing)
- `src/lib/radar/pipeline.ts` — The full ingestion → clustering → scoring → alert pipeline
- `src/app/api/x-analytics/route.ts` — OpenCLI X data fetcher
- `src/app/api/import/route.ts` — CSV import for posts + analytics
- `src/app/settings/page.tsx` — BYOK key management UI
