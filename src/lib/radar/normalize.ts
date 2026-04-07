// Article normalization + hashing + entity extraction
// Converts raw feed items into a consistent schema before storage.

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import type { NormalizedArticle } from './types';

// ── URL canonicalization ─────────────────────────────────────────────────────

function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Drop tracking params
    const DROP_PARAMS = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'ref', 'source', 'fbclid', 'gclid', 'mc_cid', 'mc_eid',
    ];
    for (const param of DROP_PARAMS) u.searchParams.delete(param);
    // Normalise trailing slash
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// ── HTML → plain text ────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

// ── Named entity extraction ──────────────────────────────────────────────────
// Pragmatic extraction: capitalised noun phrases, product names, key nouns.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'its', 'it', 'this',
  'that', 'these', 'those', 'new', 'says', 'said', 'report', 'update',
  'via', 'now', 'just', 'more', 'how', 'why', 'what', 'when', 'where',
]);

export function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  // Match sequences of capitalized words (potential proper nouns/names)
  const capitalizedPhrases = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g) ?? [];
  for (const phrase of capitalizedPhrases) {
    const words = phrase.split(/\s+/);
    // Filter out single common stopwords
    const filtered = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));
    if (filtered.length >= 1 && filtered.join(' ').length >= 3) {
      entities.add(filtered.join(' '));
    }
  }

  // Known brand/product patterns
  const brandPatterns = [
    /\bGoogle\s+(?:Gemini|Bard|Search|Analytics|Ads|Chrome|Maps|Docs|Drive|AI|SGE|AI Overviews?)\b/gi,
    /\bOpenAI(?:'s)?\b/gi,
    /\bChatGPT[-\s]?(?:\d+)?(?:\s+\w+)?\b/gi,
    /\bGPT[-\s]?\d+(?:\.\d+)?(?:\s+\w+)?\b/gi,
    /\bClaude\s+(?:\d+(?:\.\d+)?|Sonnet|Opus|Haiku)?\b/gi,
    /\bMeta\s+(?:AI|Llama|Quest)\b/gi,
    /\bWordPress\b/gi,
    /\bNext\.?js\b/gi,
    /\bVercel\b/gi,
    /\bSupabase\b/gi,
  ];

  for (const pattern of brandPatterns) {
    const matches = text.match(pattern) ?? [];
    for (const m of matches) entities.add(m.trim());
  }

  return [...entities].slice(0, 20); // cap at 20 entities
}

// ── Tag extraction ───────────────────────────────────────────────────────────

const CATEGORY_TAGS: [RegExp, string][] = [
  [/\b(AI|artificial intelligence|machine learning|LLM|GPT|Claude|Gemini)\b/i, 'AI'],
  [/\b(SEO|search engine optimization|ranking|backlinks?|SERP)\b/i, 'SEO'],
  [/\b(Google|Bing|search algorithm|search update|core update)\b/i, 'Search'],
  [/\b(WordPress|WP|Gutenberg|block editor|plugin|theme)\b/i, 'WordPress'],
  [/\b(creator economy|newsletter|Substack|paid content|monetis[ae])\b/i, 'Creator Economy'],
  [/\b(social media|Twitter|X platform|Instagram|TikTok|YouTube|LinkedIn)\b/i, 'Social'],
  [/\b(publishing|media|journalism|press|editorial)\b/i, 'Publishing'],
  [/\b(product launch|new feature|beta|release|announced?)\b/i, 'Product'],
  [/\b(content marketing|blogging|copywriting|content strategy)\b/i, 'Content'],
];

export function extractTags(title: string, content: string): string[] {
  const combined = `${title} ${content}`;
  const tags = new Set<string>();
  for (const [pattern, tag] of CATEGORY_TAGS) {
    if (pattern.test(combined)) tags.add(tag);
  }
  return [...tags];
}

// ── Main normalization function ──────────────────────────────────────────────

interface RawArticleInput {
  title: string;
  url: string;
  publishedAt: string | null;
  author: string | null;
  rawContent: string;
  imageUrl: string | null;
  sourceId: string;
  sourceName: string;
  sourceCategory: string;
}

export function normalizeArticle(raw: RawArticleInput): NormalizedArticle {
  const canonicalUrl = canonicalizeUrl(raw.url);
  const urlHash = sha256(canonicalUrl);
  const excerpt = truncate(stripHtml(raw.rawContent), 500);
  const contentHash = sha256(`${raw.title}::${excerpt}`);
  const entities = extractEntities(`${raw.title} ${excerpt}`);
  const tags = extractTags(raw.title, excerpt);

  return {
    sourceId: raw.sourceId,
    sourceName: raw.sourceName,
    sourceCategory: raw.sourceCategory,
    title: raw.title.trim(),
    canonicalUrl,
    urlHash,
    contentHash,
    publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : null,
    fetchedAt: new Date(),
    author: raw.author?.trim() ?? null,
    excerpt: excerpt || null,
    cleanedContent: excerpt || null,
    imageUrl: raw.imageUrl,
    language: 'en',
    entities,
    tags,
  };
}

// ── Database operations ──────────────────────────────────────────────────────

export async function isNewArticle(urlHash: string): Promise<boolean> {
  const { data } = await supabase
    .from('radar_articles')
    .select('id')
    .eq('url_hash', urlHash)
    .maybeSingle();
  return !data;
}

export async function saveArticle(article: NormalizedArticle): Promise<string | null> {
  const { data, error } = await supabase
    .from('radar_articles')
    .insert({
      source_id: article.sourceId,
      source_name: article.sourceName,
      source_category: article.sourceCategory,
      title: article.title,
      canonical_url: article.canonicalUrl,
      url_hash: article.urlHash,
      content_hash: article.contentHash,
      published_at: article.publishedAt?.toISOString() ?? null,
      fetched_at: article.fetchedAt.toISOString(),
      author: article.author,
      excerpt: article.excerpt,
      cleaned_content: article.cleanedContent,
      image_url: article.imageUrl,
      language: article.language,
      entities: article.entities,
      tags: article.tags,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return null; // duplicate, silently skip
    console.error('[Radar] saveArticle error:', error.message);
    return null;
  }

  return data.id as string;
}
