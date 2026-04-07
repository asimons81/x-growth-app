import { NextRequest, NextResponse } from 'next/server';
import { getRadarSettings, updateRadarSetting } from '@/lib/radar/settings';

export async function GET() {
  const settings = await getRadarSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>;

  const KEY_MAP: Record<string, string> = {
    scoreThresholds: 'score_thresholds',
    alertCooldownHours: 'alert_cooldown_hours',
    scoreJumpOverride: 'score_jump_override',
    ingestionIntervalMin: 'ingestion_interval_min',
    maxClusterAgeDays: 'max_cluster_age_days',
    nicheKeywords: 'niche_keywords',
    scoreWeights: 'score_weights',
  };

  for (const [jsKey, dbKey] of Object.entries(KEY_MAP)) {
    if (jsKey in body) {
      await updateRadarSetting(dbKey, body[jsKey]);
    }
  }

  const updated = await getRadarSettings();
  return NextResponse.json({ settings: updated });
}
