"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertCircle, BookOpen, Radio, TrendingUp, Zap, Globe, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

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
}

interface Alert {
  id: string;
  alert_type: string;
  score: number;
  created_at: string;
  discord_sent: boolean;
  radar_clusters: { canonical_headline: string; status: string };
}

interface Brief {
  id: string;
  date: string;
  entry_count: number;
  google_doc_url: string | null;
  status: string;
}

interface Source {
  id: string;
  health_status: string;
  category: string;
}

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

function StatusBadge({ status }: { status: string }) {
  const color = status === 'alerted' ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : status === 'watchlist' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : status === 'archived' ? 'text-[#4b5563] bg-[#1c1c2e] border-[#2a2a45]'
    : 'text-[#94a3b8] bg-[#161625] border-[#2a2a45]';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${color}`}>
      {status}
    </span>
  );
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${m}m ago`;
}

export default function RadarOverview() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [clustersRes, alertsRes, briefsRes, sourcesRes] = await Promise.all([
        fetch('/api/radar/clusters?limit=10').then((r) => r.json()),
        fetch('/api/radar/alerts?limit=5').then((r) => r.json()),
        fetch('/api/radar/briefs?limit=7').then((r) => r.json()),
        fetch('/api/radar/sources').then((r) => r.json()),
      ]);
      setClusters(clustersRes.data ?? []);
      setAlerts(alertsRes.data ?? []);
      setBriefs(briefsRes.data ?? []);
      setSources(sourcesRes.data ?? []);
    } catch {
      toast.error('Failed to load Radar data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function triggerPipeline() {
    setRunning(true);
    try {
      const res = await fetch('/api/radar/pipeline', { method: 'POST' });
      const data = await res.json() as { ok: boolean; result?: { ingestion: Array<{ newArticles: number }>; alerted: number } };
      if (data.ok) {
        const total = data.result?.ingestion.reduce((s: number, r) => s + r.newArticles, 0) ?? 0;
        toast.success(`Pipeline complete: ${total} new articles, ${data.result?.alerted ?? 0} alerts`);
        fetchAll();
      } else {
        toast.error('Pipeline failed');
      }
    } catch {
      toast.error('Pipeline request failed');
    } finally {
      setRunning(false);
    }
  }

  const healthyCount = sources.filter((s) => s.health_status === 'healthy').length;
  const failingCount = sources.filter((s) => s.health_status === 'failing').length;
  const categoryBreakdown = sources.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  }, {});

  const highPriority = clusters.filter((c) => c.latest_score >= 72);
  const watchlist = clusters.filter((c) => c.latest_score >= 45 && c.latest_score < 72);
  const todaysBrief = briefs.find((b) => b.date === new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Radio size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Radar</h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Intelligence
            </span>
          </div>
          <p className="text-[#94a3b8] text-sm ml-12">
            Spot high-upside topics early — before saturation.
          </p>
        </div>
        <button
          onClick={triggerPipeline}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
          {running ? 'Running…' : 'Run Pipeline'}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Zap size={16} />} label="High Priority" value={highPriority.length} accent="indigo" />
        <StatCard icon={<Activity size={16} />} label="Watchlist" value={watchlist.length} accent="amber" />
        <StatCard icon={<AlertCircle size={16} />} label="Alerts Today" value={alerts.length} accent="red" />
        <StatCard
          icon={<Globe size={16} />}
          label="Sources Active"
          value={`${healthyCount}/${sources.length}`}
          sub={failingCount > 0 ? `${failingCount} failing` : undefined}
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High-priority clusters */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f1f5f9] uppercase tracking-wide">Top Clusters</h2>
            <Link href="/radar/clusters" className="text-[12px] text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#1c1c2e] animate-pulse" />
              ))}
            </div>
          ) : clusters.length === 0 ? (
            <EmptyCard message="No clusters yet. Run the pipeline to start monitoring." />
          ) : (
            <div className="space-y-2">
              {clusters.slice(0, 8).map((cluster) => (
                <Link
                  key={cluster.id}
                  href={`/radar/clusters/${cluster.id}`}
                  className="block p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35] hover:border-indigo-500/30 hover:bg-[#161625] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9] truncate">{cluster.canonical_headline}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-[#4b5563]">{cluster.source_count} sources</span>
                        <span className="text-[#2a2a45]">·</span>
                        <span className="text-[11px] text-[#4b5563]">{timeAgo(cluster.first_seen_at)}</span>
                        {cluster.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45]">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={cluster.status} />
                      <ScoreBadge score={cluster.latest_score} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column: alerts + brief + sources */}
        <div className="space-y-6">
          {/* Today's brief */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#f1f5f9] uppercase tracking-wide">Today&apos;s Brief</h2>
              <Link href="/radar/briefs" className="text-[12px] text-indigo-400 hover:text-indigo-300">All →</Link>
            </div>
            {todaysBrief ? (
              <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#f1f5f9]">{todaysBrief.date}</span>
                  <span className="text-[11px] text-[#94a3b8]">{todaysBrief.entry_count} entries</span>
                </div>
                {todaysBrief.google_doc_url ? (
                  <a
                    href={todaysBrief.google_doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-[12px] text-indigo-400 hover:text-indigo-300"
                  >
                    <BookOpen size={12} /> Open Google Doc
                  </a>
                ) : (
                  <p className="mt-2 text-[11px] text-[#4b5563]">DB-only (Google Docs not configured)</p>
                )}
              </div>
            ) : (
              <EmptyCard message="No brief yet today" />
            )}
          </div>

          {/* Recent alerts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#f1f5f9] uppercase tracking-wide">Recent Alerts</h2>
              <Link href="/radar/alerts" className="text-[12px] text-indigo-400 hover:text-indigo-300">All →</Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
              </div>
            ) : alerts.length === 0 ? (
              <EmptyCard message="No alerts fired yet" />
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-3 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase ${alert.alert_type === 'high_priority' ? 'text-red-400' : 'text-indigo-400'}`}>
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-[#4b5563]">{timeAgo(alert.created_at)}</span>
                    </div>
                    <p className="text-[12px] text-[#f1f5f9] mt-0.5 truncate">
                      {alert.radar_clusters?.canonical_headline}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <ScoreBadge score={alert.score} />
                      {alert.discord_sent && (
                        <span className="text-[10px] text-emerald-400">✓ Discord</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source health */}
          <div>
            <h2 className="text-sm font-semibold text-[#f1f5f9] uppercase tracking-wide mb-3">Source Health</h2>
            <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35] space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#94a3b8]">Healthy</span>
                <span className="text-emerald-400 font-medium">{healthyCount}</span>
              </div>
              {failingCount > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#94a3b8]">Failing</span>
                  <span className="text-red-400 font-medium">{failingCount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#1e1e35]">
                {Object.entries(categoryBreakdown).sort().map(([cat, count]) => (
                  <div key={cat} className="flex justify-between text-[11px] py-0.5">
                    <span className="text-[#4b5563]">{cat}</span>
                    <span className="text-[#94a3b8]">{count}</span>
                  </div>
                ))}
              </div>
              <Link href="/radar/sources" className="block text-center text-[11px] text-indigo-400 hover:text-indigo-300 pt-1">
                Manage sources →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mental model footer */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35] text-[12px] text-[#4b5563]">
        <TrendingUp size={14} className="text-indigo-400 shrink-0" />
        <span>
          <span className="text-[#94a3b8] font-medium">Analytics</span> = what performed ·{' '}
          <span className="text-indigo-400 font-medium">Radar</span> = what is emerging ·{' '}
          <span className="text-[#94a3b8] font-medium">Insights</span> = what to do with it
        </span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: 'indigo' | 'amber' | 'red' | 'emerald';
}) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
  };

  return (
    <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
      <div className={`w-8 h-8 rounded-lg ${colors[accent]} flex items-center justify-center mb-3`}>
        <span className={colors[accent].split(' ')[0]}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-[#f1f5f9]">{value}</p>
      <p className="text-[12px] text-[#94a3b8] mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-red-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#0f0f1a] border border-dashed border-[#2a2a45] text-center">
      <p className="text-[12px] text-[#4b5563]">{message}</p>
    </div>
  );
}
