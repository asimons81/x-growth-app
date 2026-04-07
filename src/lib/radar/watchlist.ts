// Watchlist state machine
// Evaluates clusters and promotes/demotes them based on scoring thresholds.

import { supabase } from '@/lib/supabase';
import { getRadarSettings } from './settings';
import type { ClusterStatus } from './types';

export async function updateWatchlistStates(): Promise<{
  promoted: number;
  ignored: number;
  archived: number;
}> {
  const settings = await getRadarSettings();
  const { alert: alertThreshold, watchlist: watchlistThreshold, ignore: ignoreThreshold } = settings.scoreThresholds;

  let promoted = 0;
  let ignored = 0;
  let archived = 0;

  // Fetch active clusters with their latest scores
  const { data: clusters } = await supabase
    .from('radar_clusters')
    .select('id, status, latest_score, source_count, first_seen_at, last_seen_at, last_alerted_at')
    .in('status', ['watchlist', 'ignored']);

  if (!clusters?.length) return { promoted, ignored, archived };

  const now = new Date();

  for (const cluster of clusters) {
    const score = (cluster.latest_score as number) ?? 0;
    const currentStatus = cluster.status as ClusterStatus;
    const firstSeen = new Date(cluster.first_seen_at as string);
    const lastSeen = new Date(cluster.last_seen_at as string);
    const ageDays = (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24);
    const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);

    let newStatus: ClusterStatus = currentStatus;

    // Auto-archive: cluster is old and stale
    const maxAgeDays = settings.maxClusterAgeDays;
    if (ageDays > maxAgeDays && hoursSinceLastSeen > 24) {
      newStatus = 'archived';
    }
    // Promote ignored → watchlist if score improved
    else if (currentStatus === 'ignored' && score >= watchlistThreshold) {
      newStatus = 'watchlist';
    }
    // Demote watchlist → ignored if score fell below ignore threshold
    else if (currentStatus === 'watchlist' && score < ignoreThreshold && ageDays > 1) {
      newStatus = 'ignored';
    }

    if (newStatus !== currentStatus) {
      await transitionClusterStatus(cluster.id as string, currentStatus, newStatus);

      if (newStatus === 'archived') archived++;
      else if (newStatus === 'ignored') ignored++;
      else if (newStatus === 'watchlist') promoted++;
    }
  }

  return { promoted, ignored, archived };
}

export async function transitionClusterStatus(
  clusterId: string,
  from: ClusterStatus,
  to: ClusterStatus
): Promise<void> {
  await supabase
    .from('radar_clusters')
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq('id', clusterId);

  await supabase.from('radar_cluster_events').insert({
    cluster_id: clusterId,
    event_type: to === 'archived' ? 'archived' : to === 'alerted' ? 'alerted' : to === 'watchlist' ? 'watchlisted' : 'cooled_down',
    previous_status: from,
    new_status: to,
  });
}

export async function promoteToAlerted(clusterId: string): Promise<void> {
  const { data: cluster } = await supabase
    .from('radar_clusters')
    .select('status')
    .eq('id', clusterId)
    .single();

  if (!cluster) return;

  const prev = cluster.status as ClusterStatus;
  await transitionClusterStatus(clusterId, prev, 'alerted');
  await supabase
    .from('radar_clusters')
    .update({ last_alerted_at: new Date().toISOString() })
    .eq('id', clusterId);
}
