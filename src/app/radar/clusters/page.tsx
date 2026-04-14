"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Filter } from 'lucide-react';

interface Cluster {
  id: string;
  canonical_headline: string;
  canonical_summary: string | null;
  status: string;
  latest_score: number;
  source_count: number;
  source_diversity: number;
  mainstream_pickup_level: string;
  tags: string[];
  entities: string[];
  first_seen_at: string;
  last_seen_at: string;
  why_flagged: string | null;
}

const STATUS_OPTIONS = ['all', 'alerted', 'watchlist', 'ignored', 'archived'];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : score >= 60 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    : score >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-[#4b5563] bg-[#1c1c2e] border-[#2a2a45]';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${color}`}>
      {score}
    </span>
  );
}

function PickupBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    none: 'text-emerald-400',
    low: 'text-amber-400',
    medium: 'text-orange-400',
    high: 'text-red-400',
  };
  return <span className={`text-[10px] font-medium ${colors[level] ?? 'text-[#4b5563]'}`}>
    {level === 'none' ? '🟢 early' : level === 'high' ? '🔴 saturated' : `🟡 ${level} pickup`}
  </span>;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${Math.floor(diff / 60_000)}m ago`;
}

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [total, setTotal] = useState(0);

  const fetchClusters = useCallback(async (status: string) => {
    setLoading(true);
    const q = status === 'all' ? '' : `&status=${status}`;
    const res = await fetch(`/api/radar/clusters?limit=50${q}`);
    const data = await res.json() as { data?: Cluster[]; count?: number };
    setClusters(data.data ?? []);
    setTotal(data.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClusters(statusFilter); }, [statusFilter, fetchClusters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Clusters</h1>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">{total} topic clusters</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#4b5563]" />
          <div className="flex bg-[#0f0f1a] border border-[#1e1e35] rounded-xl overflow-hidden">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#161625]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
        </div>
      ) : clusters.length === 0 ? (
        <div className="text-center py-20 text-[#4b5563]">
          <p className="text-lg">No clusters found</p>
          <p className="text-sm mt-1">Run the pipeline from the Overview page to start monitoring.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clusters.map((cluster) => (
            <Link
              key={cluster.id}
              href={`/radar/clusters/${cluster.id}`}
              className="block p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e35] hover:border-indigo-500/30 hover:bg-[#161625] transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-white leading-snug">
                    {cluster.canonical_headline}
                  </p>
                  {cluster.canonical_summary && (
                    <p className="text-[12px] text-[#4b5563] mt-1 line-clamp-2">{cluster.canonical_summary}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] text-[#94a3b8]">{cluster.source_count} src</span>
                    <span className="text-[#2a2a45]">·</span>
                    <span className="text-[11px] text-[#94a3b8]">{cluster.source_diversity} cat</span>
                    <span className="text-[#2a2a45]">·</span>
                    <span className="text-[11px] text-[#94a3b8]">first {timeAgo(cluster.first_seen_at)}</span>
                    <span className="text-[#2a2a45]">·</span>
                    <PickupBadge level={cluster.mainstream_pickup_level} />
                    {cluster.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#161625] text-[#94a3b8] border border-[#2a2a45]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {cluster.why_flagged && (
                    <p className="text-[11px] text-indigo-400 mt-1 italic">{cluster.why_flagged}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <ScoreBadge score={cluster.latest_score} />
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                    cluster.status === 'alerted' ? 'text-red-400 border-red-500/20 bg-red-500/10'
                    : cluster.status === 'watchlist' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                    : 'text-[#4b5563] border-[#2a2a45] bg-[#1c1c2e]'
                  }`}>
                    {cluster.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
