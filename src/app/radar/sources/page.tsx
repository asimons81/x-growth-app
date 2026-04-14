"use client";

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Globe, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface Source {
  id: string;
  name: string;
  category: string;
  type: string;
  homepage_url: string;
  feed_url: string | null;
  enabled: boolean;
  trust_score: number;
  speed_score: number;
  noise_score: number;
  notes: string | null;
  last_checked_at: string | null;
  health_status: string;
  consecutive_failures: number;
}

const HEALTH_ICONS: Record<string, React.ReactNode> = {
  healthy: <CheckCircle size={12} className="text-emerald-400" />,
  degraded: <AlertTriangle size={12} className="text-amber-400" />,
  failing: <XCircle size={12} className="text-red-400" />,
  unknown: <Globe size={12} className="text-[#4b5563]" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'AI': 'text-purple-400',
  'Search': 'text-blue-400',
  'SEO': 'text-indigo-400',
  'Social': 'text-pink-400',
  'WordPress': 'text-cyan-400',
  'Publishing': 'text-amber-400',
  'Creator Economy': 'text-orange-400',
  'Big Tech': 'text-red-400',
  'Tools': 'text-emerald-400',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${m}m ago`;
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? 'text-emerald-400' : value >= 5 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="text-center">
      <span className={`text-[11px] font-bold ${color}`}>{value}</span>
      <p className="text-[9px] text-[#4b5563] mt-0.5">{label}</p>
    </div>
  );
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchSources = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/radar/sources');
    const data = await res.json() as { data?: Source[] };
    setSources(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  async function toggleSource(source: Source) {
    const res = await fetch('/api/radar/sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: source.id, enabled: !source.enabled }),
    });
    if (res.ok) {
      setSources((prev) => prev.map((s) => s.id === source.id ? { ...s, enabled: !s.enabled } : s));
      toast.success(source.enabled ? `Disabled ${source.name}` : `Enabled ${source.name}`);
    }
  }

  const categories = ['all', ...new Set(sources.map((s) => s.category))].sort();
  const filtered = categoryFilter === 'all' ? sources : sources.filter((s) => s.category === categoryFilter);

  const healthyCount = sources.filter((s) => s.health_status === 'healthy').length;
  const failingCount = sources.filter((s) => s.health_status === 'failing').length;
  const enabledCount = sources.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Sources</h1>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">
            {enabledCount}/{sources.length} enabled · {healthyCount} healthy · {failingCount} failing
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${
              categoryFilter === cat
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-[#0f0f1a] text-[#94a3b8] border-[#2a2a45] hover:border-indigo-500/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((source) => (
            <div
              key={source.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                source.enabled
                  ? 'bg-[#0f0f1a] border-[#1e1e35]'
                  : 'bg-[#0a0a14] border-[#161625] opacity-60'
              }`}
            >
              {/* Health indicator */}
              <div className="shrink-0">{HEALTH_ICONS[source.health_status]}</div>

              {/* Name & category */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={source.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-medium text-[#f1f5f9] hover:text-indigo-300 flex items-center gap-1"
                  >
                    {source.name}
                    <ExternalLink size={10} className="opacity-50" />
                  </a>
                  <span className={`text-[10px] font-medium ${CATEGORY_COLORS[source.category] ?? 'text-[#94a3b8]'}`}>
                    {source.category}
                  </span>
                  <span className="text-[10px] text-[#2a2a45] border border-[#2a2a45] px-1.5 py-0.5 rounded">{source.type}</span>
                </div>
                {source.last_checked_at && (
                  <p className="text-[11px] text-[#4b5563] mt-0.5">
                    Last checked {timeAgo(source.last_checked_at)}
                    {source.consecutive_failures > 0 && (
                      <span className="text-red-400 ml-2">{source.consecutive_failures} failures</span>
                    )}
                  </p>
                )}
              </div>

              {/* Score cells */}
              <div className="hidden lg:flex items-center gap-4 shrink-0">
                <ScoreCell label="Trust" value={source.trust_score} />
                <ScoreCell label="Speed" value={source.speed_score} />
                <ScoreCell label="Noise" value={source.noise_score} />
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleSource(source)}
                className={`shrink-0 w-10 h-5 rounded-full transition-all relative ${
                  source.enabled ? 'bg-indigo-600' : 'bg-[#1c1c2e]'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                  source.enabled ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
