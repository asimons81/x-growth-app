// Daily brief writer
// Maintains one Google Doc per day with a structured Radar brief.
// Falls back to DB-only storage if Google credentials are not configured.

import { supabase } from '@/lib/supabase';
import { getRadarSettings } from './settings';
import type { BriefSection } from './types';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000';
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '';
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

function isGoogleConfigured(): boolean {
  return !!(GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
}

// ── Google Auth (service account JWT) ────────────────────────────────────────

async function getGoogleAccessToken(): Promise<string> {
  if (!isGoogleConfigured()) throw new Error('Google service account not configured');

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Build JWT header.payload
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signingInput = `${header}.${payload}`;

  // Sign with RS256 using Node crypto
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, 'base64url');
  const jwt = `${signingInput}.${signature}`;

  // Exchange JWT for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google auth failed: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ── Google Docs / Drive helpers ───────────────────────────────────────────────

async function createGoogleDoc(title: string, token: string): Promise<{ id: string; url: string }> {
  const res = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) throw new Error(`Create doc failed: ${await res.text()}`);
  const doc = await res.json() as { documentId: string };

  // Move to configured Drive folder
  if (GOOGLE_DRIVE_FOLDER_ID) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${doc.documentId}?addParents=${GOOGLE_DRIVE_FOLDER_ID}&removeParents=root&fields=id,parents`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return {
    id: doc.documentId,
    url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
  };
}

async function appendToGoogleDoc(docId: string, content: string, token: string): Promise<void> {
  // Get doc end index
  const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const doc = await docRes.json() as { body: { content: Array<{ endIndex?: number }> } };
  const endIndex = doc.body.content.reduce((max, el) => Math.max(max, el.endIndex ?? 1), 1) - 1;

  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: Math.max(1, endIndex) },
            text: content,
          },
        },
      ],
    }),
  });
}

// ── Brief content builder ─────────────────────────────────────────────────────

interface BriefCluster {
  id: string;
  canonical_headline: string;
  canonical_summary: string | null;
  latest_score: number;
  status: string;
  tags: string[];
  why_flagged: string | null;
  suggested_angles: string[];
  first_seen_at: string;
  source_count: number;
}

async function getBriefSectionClusters(section: BriefSection, settings: Awaited<ReturnType<typeof getRadarSettings>>): Promise<BriefCluster[]> {
  let query = supabase
    .from('radar_clusters')
    .select('id, canonical_headline, canonical_summary, latest_score, status, tags, why_flagged, suggested_angles, first_seen_at, source_count')
    .order('latest_score', { ascending: false })
    .limit(section === 'high_priority' ? 5 : 8);

  if (section === 'high_priority') {
    query = query.gte('latest_score', settings.scoreThresholds.alert);
  } else if (section === 'watchlist') {
    query = query
      .gte('latest_score', settings.scoreThresholds.watchlist)
      .lt('latest_score', settings.scoreThresholds.alert);
  }

  const { data } = await query;
  return (data ?? []) as BriefCluster[];
}

function formatClusterEntry(cluster: BriefCluster, section: BriefSection, index: number): string {
  const tags = cluster.tags?.join(', ') ?? '';
  const angles = cluster.suggested_angles?.slice(0, 2).map((a) => `  • ${a}`).join('\n') ?? '';
  const appLink = `${APP_BASE_URL}/radar/clusters/${cluster.id}`;
  const hoursAgo = ((Date.now() - new Date(cluster.first_seen_at).getTime()) / 3_600_000).toFixed(0);

  return `\n${index}. ${cluster.canonical_headline}
   Score: ${cluster.latest_score}/100 | Tags: ${tags} | First seen: ${hoursAgo}h ago | Sources: ${cluster.source_count}
   ${cluster.why_flagged ? `Why flagged: ${cluster.why_flagged}` : ''}
   ${cluster.canonical_summary ? `Summary: ${cluster.canonical_summary.slice(0, 200)}` : ''}
${angles ? `   Angles:\n${angles}` : ''}
   View in Radar: ${appLink}\n`;
}

function buildBriefText(
  date: string,
  highPriority: BriefCluster[],
  watchlist: BriefCluster[]
): string {
  const sep = '\n' + '─'.repeat(60) + '\n';
  let text = `NEWS RADAR BRIEF — ${date}\nGenerated by GrowthOS Radar\n${sep}`;

  text += `\n🔥 HIGH PRIORITY (${highPriority.length})\n`;
  if (highPriority.length === 0) text += '  No high-priority topics right now.\n';
  else highPriority.forEach((c, i) => { text += formatClusterEntry(c, 'high_priority', i + 1); });

  text += `${sep}\n📈 WATCHLIST (${watchlist.length})\n`;
  if (watchlist.length === 0) text += '  Watchlist is quiet.\n';
  else watchlist.forEach((c, i) => { text += formatClusterEntry(c, 'watchlist', i + 1); });

  text += `${sep}\nView all Radar data: ${APP_BASE_URL}/radar\n`;
  return text;
}

// ── Main brief update function ────────────────────────────────────────────────

export async function updateDailyBrief(): Promise<{ briefId: string; docUrl: string | null }> {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getRadarSettings();

  // Upsert brief record
  const { data: existing } = await supabase
    .from('radar_daily_briefs')
    .select('id, google_doc_id, google_doc_url')
    .eq('date', today)
    .maybeSingle();

  const [highPriority, watchlist] = await Promise.all([
    getBriefSectionClusters('high_priority', settings),
    getBriefSectionClusters('watchlist', settings),
  ]);

  const allClusters = [...highPriority, ...watchlist];
  const entryCount = allClusters.length;

  let briefId: string;
  let docId: string | null = existing?.google_doc_id as string | null ?? null;
  let docUrl: string | null = existing?.google_doc_url as string | null ?? null;

  if (existing) {
    briefId = existing.id as string;
    await supabase
      .from('radar_daily_briefs')
      .update({ entry_count: entryCount, updated_at: new Date().toISOString() })
      .eq('id', briefId);
  } else {
    const { data: newBrief } = await supabase
      .from('radar_daily_briefs')
      .insert({ date: today, entry_count: entryCount, status: 'draft' })
      .select('id')
      .single();
    briefId = newBrief!.id as string;
  }

  // Upsert brief entries
  for (const cluster of allClusters) {
    const section: BriefSection = highPriority.some((c) => c.id === cluster.id) ? 'high_priority' : 'watchlist';

    // Get source links for this cluster
    const { data: clusterArticles } = await supabase
      .from('radar_cluster_articles')
      .select('article_id')
      .eq('cluster_id', cluster.id)
      .limit(5);

    const articleIds = (clusterArticles ?? []).map((r) => r.article_id as string);
    const { data: articles } = await supabase
      .from('radar_articles')
      .select('canonical_url, source_name')
      .in('id', articleIds);

    const sourceLinks = (articles ?? []).map((a) => `${a.source_name}: ${a.canonical_url}`);

    await supabase.from('radar_brief_entries').upsert(
      {
        brief_id: briefId,
        cluster_id: cluster.id,
        section,
        score: cluster.latest_score,
        why_flagged: cluster.why_flagged,
        what_happened: cluster.canonical_summary?.slice(0, 400) ?? null,
        suggested_angle: cluster.suggested_angles?.[0] ?? null,
        source_links: sourceLinks,
        added_at: new Date().toISOString(),
      },
      { onConflict: 'brief_id,cluster_id' }
    );
  }

  // Write to Google Docs if configured
  if (isGoogleConfigured() && entryCount > 0) {
    try {
      const token = await getGoogleAccessToken();
      const briefText = buildBriefText(today, highPriority, watchlist);

      if (!docId) {
        // Create new doc
        const docTitle = `News Radar - ${today}`;
        const { id, url } = await createGoogleDoc(docTitle, token);
        docId = id;
        docUrl = url;

        await supabase
          .from('radar_daily_briefs')
          .update({ google_doc_id: docId, google_doc_url: docUrl })
          .eq('id', briefId);

        await appendToGoogleDoc(docId, briefText, token);
      } else {
        // Append update section
        const updateText = `\n\n--- UPDATE ${new Date().toLocaleTimeString()} ---\n${buildBriefText(today, highPriority, watchlist)}`;
        await appendToGoogleDoc(docId, updateText, token);
      }
    } catch (err) {
      console.error('[Radar] Google Docs error:', err instanceof Error ? err.message : err);
      // Non-fatal — brief is stored in DB regardless
    }
  }

  return { briefId, docUrl };
}
