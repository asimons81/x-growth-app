"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle, XCircle } from 'lucide-react';

interface Alert {
  id: string;
  cluster_id: string;
  alert_type: string;
  score: number;
  discord_sent: boolean;
  discord_error: string | null;
  discord_sent_at: string | null;
  created_at: string;
  radar_clusters: {
    canonical_headline: string;
    latest_score: number;
    tags: string[];
    status: string;
  } | null;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${Math.floor(diff / 60_000)}m ago`;
}

const ALERT_COLORS: Record<string, string> = {
  high_priority: 'text-red-400 bg-red-500/10 border-red-500/20',
  early_signal: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  watchlist_promo: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/radar/alerts?limit=50')
      .then((r) => r.json())
      .then((d: { data?: Alert[] }) => {
        setAlerts(d.data ?? []);
        setLoading(false);
      });
  }, []);

  const sentCount = alerts.filter((a) => a.discord_sent).length;
  const failedCount = alerts.filter((a) => !a.discord_sent).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Alerts</h1>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">
            {alerts.length} alerts — {sentCount} sent to Discord, {failedCount} failed
          </p>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
          <Bell size={14} className="text-indigo-400" />
          <span className="text-[12px] text-[#94a3b8]">Discord alerts</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-[#4b5563]">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p>No alerts fired yet.</p>
          <p className="text-sm mt-1">Alerts fire when clusters exceed the score threshold.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${ALERT_COLORS[alert.alert_type] ?? 'text-[#94a3b8] bg-[#1c1c2e] border-[#2a2a45]'}`}>
                      {alert.alert_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[12px] font-bold text-[#f1f5f9]">Score {alert.score}</span>
                    <span className="text-[11px] text-[#4b5563]">{timeAgo(alert.created_at)}</span>
                  </div>

                  {alert.radar_clusters ? (
                    <Link href={`/radar/clusters/${alert.cluster_id}`} className="text-[13px] font-medium text-[#f1f5f9] hover:text-indigo-300 transition-colors block truncate">
                      {alert.radar_clusters.canonical_headline}
                    </Link>
                  ) : (
                    <p className="text-[13px] text-[#4b5563]">Cluster deleted</p>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    {alert.discord_sent ? (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle size={11} />
                        Discord sent {alert.discord_sent_at ? timeAgo(alert.discord_sent_at) : ''}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-red-400">
                        <XCircle size={11} />
                        {alert.discord_error ?? 'Discord not sent'}
                      </div>
                    )}
                    {alert.radar_clusters?.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#161625] text-[#4b5563] border border-[#2a2a45]">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
