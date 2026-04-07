"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Clock, Tag, AlertCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

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
  last_alerted_at: string | null;
  why_flagged: string | null;
  suggested_angles: string[] | null;
}

interface Article {
  id: string;
  title: string;
  canonical_url: string;
  source_name: string;
  source_category: string;
  published_at: string | null;
  author: string | null;
  excerpt: string | null;
}

interface ScoreRecord {
  id: string;
  final_score: number;
  niche_relevance: number;
  novelty: number;
  momentum: number;
  earlyness: number;
  source_quality: number;
  audience_fit: number;
  actionability: number;
  coverage_gap: number;
  reasoning: Record<string, string>;
  scored_at: string;
}

interface Event {
  id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Alert {
  id: string;
  alert_type: string;
  score: number;
  discord_sent: boolean;
  created_at: string;
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-indigo-500' : 'bg-amber-500';
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1">
        <span className="text-[#94a3b8]">{label}</span>
        <span className="text-[#f1f5f9] font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-[#1c1c2e] rounded-full">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
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

function fmtDate(date: string): string {
  return new Date(date).toLocaleString();
}

export default function ClusterDetailPage() {
  const params = useParams() as { id: string };
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/radar/clusters/${params.id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json() as {
          cluster: Cluster;
          articles: Article[];
          scores: ScoreRecord[];
          events: Event[];
          alerts: Alert[];
        };
        setCluster(data.cluster);
        setArticles(data.articles);
        setScores(data.scores);
        setEvents(data.events);
        setAlerts(data.alerts);
      } catch {
        toast.error('Failed to load cluster');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const latestScore = scores[0];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[#1c1c2e] rounded animate-pulse" />
        <div className="h-40 bg-[#1c1c2e] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="text-center py-20">
        <p className="text-[#94a3b8]">Cluster not found</p>
        <Link href="/radar/clusters" className="text-indigo-400 text-sm mt-2 block">← Back to clusters</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/radar/clusters" className="flex items-center gap-2 text-[13px] text-[#94a3b8] hover:text-[#f1f5f9] w-fit">
        <ArrowLeft size={14} /> Clusters
      </Link>

      {/* Header card */}
      <div className="p-6 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#f1f5f9] leading-snug">{cluster.canonical_headline}</h1>
            {cluster.canonical_summary && (
              <p className="text-[14px] text-[#94a3b8] mt-2">{cluster.canonical_summary}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              <Meta label="Score" value={String(cluster.latest_score)} />
              <Meta label="Sources" value={String(cluster.source_count)} />
              <Meta label="Categories" value={String(cluster.source_diversity)} />
              <Meta label="First seen" value={timeAgo(cluster.first_seen_at)} />
              <Meta label="Last seen" value={timeAgo(cluster.last_seen_at)} />
              <Meta label="Mainstream" value={cluster.mainstream_pickup_level} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {cluster.tags?.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-4xl font-bold text-[#f1f5f9]">{cluster.latest_score}</span>
            <span className={`text-[11px] font-medium px-2 py-1 rounded-lg border ${
              cluster.status === 'alerted' ? 'text-red-400 border-red-500/20 bg-red-500/10'
              : cluster.status === 'watchlist' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
              : 'text-[#94a3b8] border-[#2a2a45] bg-[#1c1c2e]'
            }`}>{cluster.status}</span>
          </div>
        </div>

        {cluster.why_flagged && (
          <div className="mt-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
            <div className="flex items-center gap-2 text-[12px] text-indigo-400">
              <AlertCircle size={12} /> <span className="font-medium">Why flagged</span>
            </div>
            <p className="text-[13px] text-[#94a3b8] mt-1">{cluster.why_flagged}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: score breakdown + angles */}
        <div className="space-y-6">
          {latestScore && (
            <Section title="Score Breakdown">
              <div className="space-y-3">
                <ScoreBar label="Niche Relevance" value={latestScore.niche_relevance} />
                <ScoreBar label="Novelty" value={latestScore.novelty} />
                <ScoreBar label="Momentum" value={latestScore.momentum} />
                <ScoreBar label="Earlyness" value={latestScore.earlyness} />
                <ScoreBar label="Source Quality" value={latestScore.source_quality} />
                <ScoreBar label="Audience Fit" value={latestScore.audience_fit} />
                <ScoreBar label="Actionability" value={latestScore.actionability} />
                <ScoreBar label="Coverage Gap" value={latestScore.coverage_gap} />
              </div>

              {latestScore.reasoning && (
                <div className="mt-4 pt-4 border-t border-[#1e1e35] space-y-2">
                  <p className="text-[11px] font-semibold text-[#4b5563] uppercase tracking-wide">Reasoning</p>
                  {Object.entries(latestScore.reasoning).map(([key, text]) => (
                    <p key={key} className="text-[11px] text-[#4b5563]">
                      <span className="text-[#94a3b8] font-medium">{key.replace(/_/g, ' ')}: </span>{text}
                    </p>
                  ))}
                </div>
              )}
            </Section>
          )}

          {cluster.suggested_angles && cluster.suggested_angles.length > 0 && (
            <Section title="Suggested Angles">
              <ul className="space-y-2">
                {cluster.suggested_angles.map((angle, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[#94a3b8]">
                    <TrendingUp size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                    {angle}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Right: articles + timeline + alerts */}
        <div className="lg:col-span-2 space-y-6">
          <Section title={`Articles (${articles.length})`}>
            {articles.length === 0 ? (
              <p className="text-[12px] text-[#4b5563]">No articles yet</p>
            ) : (
              <div className="space-y-3">
                {articles.map((article) => (
                  <div key={article.id} className="p-3 rounded-lg bg-[#0a0a18] border border-[#1e1e35]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <a
                          href={article.canonical_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-medium text-[#f1f5f9] hover:text-indigo-300 flex items-center gap-1"
                        >
                          {article.title}
                          <ExternalLink size={10} className="shrink-0 opacity-50" />
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-medium text-[#94a3b8]">{article.source_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c1c2e] text-[#4b5563] border border-[#2a2a45]">{article.source_category}</span>
                          {article.published_at && (
                            <span className="text-[10px] text-[#4b5563]">{timeAgo(article.published_at)}</span>
                          )}
                        </div>
                        {article.excerpt && (
                          <p className="text-[11px] text-[#4b5563] mt-1 line-clamp-2">{article.excerpt}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Timeline">
            {events.length === 0 ? (
              <p className="text-[12px] text-[#4b5563]">No events</p>
            ) : (
              <div className="relative pl-4">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-[#1e1e35]" />
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-indigo-500" style={{ transform: 'translateX(-50%)' }} />
                      <div className="ml-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-[#f1f5f9]">{event.event_type.replace(/_/g, ' ')}</span>
                          {event.previous_status && event.new_status && (
                            <span className="text-[10px] text-[#4b5563]">{event.previous_status} → {event.new_status}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={10} className="text-[#4b5563]" />
                          <span className="text-[10px] text-[#4b5563]">{fmtDate(event.created_at)}</span>
                        </div>
                        {event.metadata && (
                          <p className="text-[10px] text-[#4b5563] mt-0.5">
                            {(event.metadata as { source_name?: string; headline?: string }).source_name ?? ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {alerts.length > 0 && (
            <Section title="Alert History">
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-[#1e1e35] last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${alert.alert_type === 'high_priority' ? 'text-red-400' : 'text-indigo-400'}`}>
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[#4b5563]">score {alert.score}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.discord_sent && <span className="text-[10px] text-emerald-400">✓ Discord</span>}
                      <span className="text-[10px] text-[#4b5563]">{timeAgo(alert.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
      <h2 className="text-[12px] font-semibold text-[#f1f5f9] uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[12px]">
      <span className="text-[#4b5563]">{label}: </span>
      <span className="text-[#94a3b8] font-medium">{value}</span>
    </div>
  );
}
