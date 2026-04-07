// Discord alert dispatcher
// Sends compact, useful alerts for qualified clusters.
// Anti-spam rules enforced: cooldown + score-jump override.

import { supabase } from '@/lib/supabase';
import { getRadarSettings } from './settings';
import { promoteToAlerted } from './watchlist';
import type { AlertType, AlertPayload } from './types';

const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ??
  'https://discordapp.com/api/webhooks/1490897821698756678/KghLxPa0MGjqX6cyJZx44SNnZ9Bsc2S656Mj8KLHxbIdpp_KznEvED1M7fyFebbYBu14';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000';

function labelForType(type: AlertType): string {
  switch (type) {
    case 'early_signal': return '🔭 [EARLY SIGNAL]';
    case 'high_priority': return '🔥 [HIGH PRIORITY]';
    case 'watchlist_promo': return '📈 [WATCHLIST MOVER]';
  }
}

function formatDiscordMessage(payload: AlertPayload, alertType: AlertType): object {
  const label = labelForType(alertType);
  const tags = payload.tags.length ? payload.tags.join(', ') : 'General';

  const content = [
    `**${label}**`,
    `**Topic:** ${payload.topic}`,
    `**Score:** ${payload.score}/100`,
    `**Why:** ${payload.reason}`,
    `**Tags:** ${tags}`,
    `**Open in Radar:** ${payload.clusterUrl}`,
    payload.briefUrl ? `**Daily Brief:** ${payload.briefUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    embeds: [
      {
        description: content,
        color: alertType === 'high_priority' ? 0xff4444 : alertType === 'early_signal' ? 0x6366f1 : 0x10b981,
        timestamp: new Date().toISOString(),
        footer: { text: 'GrowthOS Radar' },
      },
    ],
  };
}

async function sendDiscordWebhook(payload: object): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return { ok: false, error: `Discord ${res.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function determineAlertType(score: number, sourceCount: number, hoursOld: number): AlertType {
  if (score >= 85) return 'high_priority';
  if (hoursOld <= 6 && sourceCount <= 4) return 'early_signal';
  return 'watchlist_promo';
}

function buildWhyFlagged(
  score: number,
  sourceCount: number,
  sourceDiversity: number,
  hoursOld: number,
  mainstreamPickup: string
): string {
  const parts: string[] = [];
  if (sourceCount >= 2) parts.push(`${sourceCount} sources in ${hoursOld.toFixed(0)}h`);
  if (sourceDiversity >= 2) parts.push(`${sourceDiversity} different source categories`);
  if (mainstreamPickup === 'none' || mainstreamPickup === 'low') parts.push('low mainstream saturation');
  if (score >= 80) parts.push('high niche relevance score');
  return parts.join(', ') || `Score ${score}/100`;
}

export async function checkAndSendAlerts(): Promise<number> {
  const settings = await getRadarSettings();
  const alertThreshold = settings.scoreThresholds.alert;
  const cooldownHours = settings.alertCooldownHours;
  const scoreJumpOverride = settings.scoreJumpOverride;

  // Find clusters that qualify for alerting
  const { data: candidates } = await supabase
    .from('radar_clusters')
    .select('id, canonical_headline, canonical_summary, tags, entities, source_count, source_diversity, mainstream_pickup_level, first_seen_at, last_seen_at, last_alerted_at, latest_score, status')
    .gte('latest_score', alertThreshold)
    .in('status', ['watchlist', 'alerted'])
    .order('latest_score', { ascending: false })
    .limit(20);

  if (!candidates?.length) return 0;

  // Get today's brief for deep link
  const today = new Date().toISOString().slice(0, 10);
  const { data: brief } = await supabase
    .from('radar_daily_briefs')
    .select('id, google_doc_url')
    .eq('date', today)
    .maybeSingle();

  let alertsSent = 0;

  for (const cluster of candidates) {
    const clusterId = cluster.id as string;
    const score = (cluster.latest_score as number) ?? 0;
    const lastAlertedAt = cluster.last_alerted_at as string | null;
    const now = new Date();

    // Anti-spam: check cooldown
    if (lastAlertedAt) {
      const hoursSinceAlert = (now.getTime() - new Date(lastAlertedAt).getTime()) / 3_600_000;

      // Check previous alert score to determine if jump overrides cooldown
      const { data: prevAlert } = await supabase
        .from('radar_alerts')
        .select('score')
        .eq('cluster_id', clusterId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevScore = (prevAlert?.score as number) ?? 0;
      const scoreDiff = score - prevScore;

      if (hoursSinceAlert < cooldownHours && scoreDiff < scoreJumpOverride) {
        continue; // skip — within cooldown, no meaningful jump
      }
    }

    const firstSeen = new Date(cluster.first_seen_at as string);
    const hoursOld = (now.getTime() - firstSeen.getTime()) / 3_600_000;
    const sourceCount = (cluster.source_count as number) ?? 1;
    const sourceDiversity = (cluster.source_diversity as number) ?? 1;
    const mainstreamPickup = (cluster.mainstream_pickup_level as string) ?? 'none';

    const alertType = determineAlertType(score, sourceCount, hoursOld);
    const reason = buildWhyFlagged(score, sourceCount, sourceDiversity, hoursOld, mainstreamPickup);
    const tags = (cluster.tags as string[]) ?? [];

    const clusterUrl = `${APP_BASE_URL}/radar/clusters/${clusterId}`;
    const briefUrl = brief?.google_doc_url as string | undefined;

    const alertPayload: AlertPayload = {
      label: alertType,
      topic: cluster.canonical_headline as string,
      score,
      reason,
      tags,
      clusterUrl,
      briefUrl,
    };

    const discordMessage = formatDiscordMessage(alertPayload, alertType);
    const { ok, error } = await sendDiscordWebhook(discordMessage);

    // Record alert in DB regardless of Discord success
    await supabase.from('radar_alerts').insert({
      cluster_id: clusterId,
      alert_type: alertType,
      score,
      payload: alertPayload as object,
      discord_sent: ok,
      discord_sent_at: ok ? new Date().toISOString() : null,
      discord_error: error ?? null,
    });

    if (ok) {
      // Promote cluster to 'alerted' if it was on watchlist
      if (cluster.status === 'watchlist') {
        await promoteToAlerted(clusterId);
      } else {
        // Update last_alerted_at only
        await supabase
          .from('radar_clusters')
          .update({ last_alerted_at: new Date().toISOString() })
          .eq('id', clusterId);
      }
      alertsSent++;
    } else {
      console.error(`[Radar] Discord alert failed for cluster ${clusterId}: ${error}`);
    }
  }

  return alertsSent;
}
