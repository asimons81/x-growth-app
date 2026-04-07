// Main Radar pipeline runner
// Orchestrates: ingest → normalize → dedupe → cluster → score → watchlist → alert → brief

import { seedSourcesIfEmpty, ingestAllSources } from './ingestion';
import { clusterNewArticles } from './clustering';
import { scoreAllUnscoredClusters } from './scoring';
import { updateWatchlistStates } from './watchlist';
import { checkAndSendAlerts } from './alerts';
import { updateDailyBrief } from './briefs';
import type { PipelineResult } from './types';

export async function runPipeline(): Promise<PipelineResult> {
  const start = Date.now();
  console.log('[Radar] Pipeline starting...');

  // Ensure sources are seeded
  await seedSourcesIfEmpty();

  // Step 1: Ingest all enabled sources
  const ingestion = await ingestAllSources();
  const totalNew = ingestion.reduce((sum, r) => sum + r.newArticles, 0);
  console.log(`[Radar] Ingested ${totalNew} new articles from ${ingestion.length} sources`);

  // Step 2: Cluster new articles
  const clustered = await clusterNewArticles();
  console.log(`[Radar] Clustered ${clustered} articles`);

  // Step 3: Score clusters that need scoring
  const scored = await scoreAllUnscoredClusters();
  console.log(`[Radar] Scored ${scored} clusters`);

  // Step 4: Update watchlist states (promote/demote)
  const { promoted, ignored, archived } = await updateWatchlistStates();
  console.log(`[Radar] Watchlist: ${promoted} promoted, ${ignored} demoted, ${archived} archived`);

  // Step 5: Send Discord alerts
  const alerted = await checkAndSendAlerts();
  console.log(`[Radar] Sent ${alerted} Discord alerts`);

  // Step 6: Update daily brief (only if there are new items worth adding)
  let briefUpdated = false;
  if (totalNew > 0 || alerted > 0) {
    try {
      await updateDailyBrief();
      briefUpdated = true;
      console.log('[Radar] Daily brief updated');
    } catch (err) {
      console.error('[Radar] Brief update failed:', err instanceof Error ? err.message : err);
    }
  }

  const durationMs = Date.now() - start;
  console.log(`[Radar] Pipeline complete in ${durationMs}ms`);

  return {
    ingestion,
    clustered,
    scored,
    alerted,
    briefUpdated,
    durationMs,
  };
}
