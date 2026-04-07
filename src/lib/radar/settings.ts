// Radar settings manager
// Reads from radar_settings table; falls back to defaults if not configured.

import { supabase } from '@/lib/supabase';
import type { RadarSettings } from './types';

export const DEFAULT_SETTINGS: RadarSettings = {
  scoreThresholds: { alert: 72, watchlist: 45, ignore: 20 },
  alertCooldownHours: 6,
  scoreJumpOverride: 15,
  ingestionIntervalMin: 10,
  maxClusterAgeDays: 7,
  nicheKeywords: ['AI', 'SEO', 'search', 'content', 'creator', 'WordPress', 'Google', 'publish', 'algorithm'],
  scoreWeights: {
    niche_relevance: 0.24,
    novelty: 0.18,
    momentum: 0.16,
    earlyness: 0.14,
    source_quality: 0.10,
    audience_fit: 0.08,
    actionability: 0.06,
    coverage_gap: 0.04,
  },
};

export async function getRadarSettings(): Promise<RadarSettings> {
  try {
    const { data, error } = await supabase
      .from('radar_settings')
      .select('key, value');

    if (error || !data) return DEFAULT_SETTINGS;

    const map: Record<string, unknown> = {};
    for (const row of data) {
      map[row.key] = row.value;
    }

    return {
      scoreThresholds:
        (map['score_thresholds'] as RadarSettings['scoreThresholds']) ??
        DEFAULT_SETTINGS.scoreThresholds,
      alertCooldownHours:
        (map['alert_cooldown_hours'] as number) ?? DEFAULT_SETTINGS.alertCooldownHours,
      scoreJumpOverride:
        (map['score_jump_override'] as number) ?? DEFAULT_SETTINGS.scoreJumpOverride,
      ingestionIntervalMin:
        (map['ingestion_interval_min'] as number) ?? DEFAULT_SETTINGS.ingestionIntervalMin,
      maxClusterAgeDays:
        (map['max_cluster_age_days'] as number) ?? DEFAULT_SETTINGS.maxClusterAgeDays,
      nicheKeywords:
        (map['niche_keywords'] as string[]) ?? DEFAULT_SETTINGS.nicheKeywords,
      scoreWeights:
        (map['score_weights'] as RadarSettings['scoreWeights']) ?? DEFAULT_SETTINGS.scoreWeights,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateRadarSetting(key: string, value: unknown, description?: string): Promise<void> {
  await supabase.from('radar_settings').upsert(
    { key, value, description, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
}
