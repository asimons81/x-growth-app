export type ImportType = 'posts' | 'analytics';

const HEADER_ALIASES = {
  content: ['content', 'text', 'tweet text', 'tweet_text', 'post text', 'post_text', 'post', 'tweet'],
  posted_at: ['posted_at', 'posted at', 'post date', 'post_date', 'date posted', 'published at', 'timestamp'],
  impressions: ['impressions', 'impression', 'views'],
  likes: ['likes', 'like', 'favorites', 'favourites'],
  replies: ['replies', 'reply', 'comments', 'comment'],
  retweets: ['retweets', 'retweet', 'reposts', 'repost', 'shares'],
  bookmarks: ['bookmarks', 'bookmark'],
  engagement_rate: ['engagement rate', 'engagement_rate', 'er'],
  date: ['date', 'day', 'metric date', 'metric_date'],
  followers: ['followers', 'follower', 'follower count', 'follower_count', 'followers gained'],
  engagements: ['engagements', 'engagement', 'total engagements', 'total_engagements', 'interactions'],
  posts_count: ['posts_count', 'posts', 'post_count', 'tweets', 'tweet_count'],
} as const;

const EXPECTED_HEADERS: Record<ImportType, string[]> = {
  posts: ['content (or text/tweet text/post text)', 'posted_at (or date/timestamp)', 'impressions', 'likes', 'replies', 'retweets (or reposts)'],
  analytics: ['date (or day)', 'followers', 'impressions', 'engagements', 'posts_count (or posts/tweets)'],
};

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getNormalizedHeaderList(headers: string[]): string[] {
  return headers.map(normalizeHeader).filter(Boolean);
}

function getAliasSet(field: keyof typeof HEADER_ALIASES): Set<string> {
  return new Set(HEADER_ALIASES[field].map(normalizeHeader));
}

function hasAnyAlias(headers: string[], field: keyof typeof HEADER_ALIASES): boolean {
  const aliasSet = getAliasSet(field);
  return headers.some((h) => aliasSet.has(normalizeHeader(h)));
}

export function validatePostCSV(headers: string[]): boolean {
  return hasAnyAlias(headers, 'content');
}

export function validateAnalyticsCSV(headers: string[]): boolean {
  return hasAnyAlias(headers, 'date');
}

export function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = String(value ?? '');
  }
  return normalized;
}

export function getCellValue(row: Record<string, string>, field: keyof typeof HEADER_ALIASES): string {
  const aliases = HEADER_ALIASES[field].map(normalizeHeader);
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }
  return '';
}

export function getExpectedHeaders(type: ImportType): string[] {
  return EXPECTED_HEADERS[type];
}
