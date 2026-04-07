"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Cluster {
  id: string;
  canonical_headline: string;
  status: string;
  latest_score: number;
  source_count: number;
  source_diversity: number;
  tags: string[];
  first_seen_at: string;
  last_seen_at: string;
  why_flagged: string | null;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${Math.floor(diff / 60_000)}m ago`;
}

function MomentumIcon({ score }: { score: number }) {
  if (score >= 70) return <TrendingUp size={14} className="text-emerald-400" />;
  if (score >= 45) return <Minus size={14} className="text-amber-400" />;
  return <TrendingDown size={14} className="text-red-400" />;
}

export default function WatchlistPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/radar/clusters?status=watchlist&limit=50')
      .then((r) => r.json())
      .then((d: { data?: Cluster[] }) => {
        setClusters((d.data ?? []).sort((a, b) => b.latest_score - a.latest_score));
        setLoading(false);
      });
  }, []);

  const movers = clusters.filter((c) => c.latest_score >= 60);
  const steady = clusters.filter((c) => c.latest_score >= 45 && c.latest_score < 60);
  const cooling = clusters.filter((c) => c.latest_score < 45);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#f1f5f9]">Watchlist</h1>
        <p className="text-[13px] text-[#94a3b8] mt-0.5">
          {clusters.length} topics being monitored — {movers.length} approaching alert threshold
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
        </div>
      ) : clusters.length === 0 ? (
        <div className="text-center py-20 text-[#4b5563]">
          <p>No topics on the watchlist.</p>
          <p className="text-sm mt-1">Run the pipeline to start tracking topics.</p>
        </div>
      ) : (
        <>
          {movers.length > 0 && (
            <WatchlistSection title="Movers (score ≥ 60)" clusters={movers} highlight />
          )}
          {steady.length > 0 && (
            <WatchlistSection title="Steady (45–59)" clusters={steady} />
          )}
          {cooling.length > 0 && (
            <WatchlistSection title="Cooling (< 45)" clusters={cooling} />
          )}
        </>
      )}
    </div>
  );
}

function WatchlistSection({
  title,
  clusters,
  highlight = false,
}: {
  title: string;
  clusters: Cluster[];
  highlight?: boolean;
}) {
  return (
    <div>
      <h2 className={`text-[12px] font-semibold uppercase tracking-wide mb-3 ${highlight ? 'text-emerald-400' : 'text-[#4b5563]'}`}>
        {title}
      </h2>
      <div className="space-y-2">
        {clusters.map((cluster) => (
          <Link
            key={cluster.id}
            href={`/radar/clusters/${cluster.id}`}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:bg-[#161625] ${
              highlight
                ? 'bg-[#0f0f1a] border-emerald-500/20 hover:border-emerald-500/40'
                : 'bg-[#0f0f1a] border-[#1e1e35] hover:border-[#2a2a45]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <MomentumIcon score={cluster.latest_score} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[#f1f5f9] truncate">{cluster.canonical_headline}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[#4b5563]">{cluster.source_count} sources</span>
                  <span className="text-[#2a2a45]">·</span>
                  <span className="text-[11px] text-[#4b5563]">first {timeAgo(cluster.first_seen_at)}</span>
                  {cluster.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#161625] text-[#4b5563] border border-[#2a2a45]">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-xl font-bold text-[#f1f5f9] ml-4 shrink-0">{cluster.latest_score}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
