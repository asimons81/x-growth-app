"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';

interface Brief {
  id: string;
  date: string;
  entry_count: number;
  google_doc_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BriefEntry {
  id: string;
  section: string;
  score: number;
  why_flagged: string | null;
  what_happened: string | null;
  suggested_angle: string | null;
  source_links: string[];
  radar_clusters: { canonical_headline: string; tags: string[] } | null;
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [entries, setEntries] = useState<BriefEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const loadBrief = useCallback(async (brief: Brief) => {
    setSelectedBrief(brief);
    setEntriesLoading(true);
    const res = await fetch(`/api/radar/briefs?date=${brief.date}`);
    const data = await res.json() as { entries?: BriefEntry[] };
    setEntries(data.entries ?? []);
    setEntriesLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/radar/briefs?limit=30')
      .then((r) => r.json())
      .then((d: { data?: Brief[] }) => {
        const list = d.data ?? [];
        setBriefs(list);
        if (list.length > 0) loadBrief(list[0]);
        setLoading(false);
      });
  }, [loadBrief]);

  const today = new Date().toISOString().slice(0, 10);
  const highPriority = entries.filter((e) => e.section === 'high_priority');
  const watchlist = entries.filter((e) => e.section === 'watchlist');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Daily Briefs</h1>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">Structured daily intelligence reports</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
        </div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-20 text-[#4b5563]">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p>No briefs yet. Run the pipeline to generate your first brief.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Brief list */}
          <div className="space-y-2">
            {briefs.map((brief) => (
              <button
                key={brief.id}
                onClick={() => loadBrief(brief)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedBrief?.id === brief.id
                    ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                    : 'bg-[#0f0f1a] border-[#1e1e35] text-[#94a3b8] hover:border-[#2a2a45] hover:text-[#f1f5f9]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium">
                    {brief.date === today ? 'Today' : brief.date}
                  </span>
                  <span className="text-[11px] text-[#4b5563]">{brief.entry_count}</span>
                </div>
                {brief.google_doc_url && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-indigo-400">
                    <BookOpen size={9} /> Google Doc
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Brief content */}
          <div className="lg:col-span-3">
            {selectedBrief && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#f1f5f9]">
                    News Radar – {selectedBrief.date}
                    {selectedBrief.date === today && (
                      <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Today</span>
                    )}
                  </h2>
                  {selectedBrief.google_doc_url && (
                    <a
                      href={selectedBrief.google_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <ExternalLink size={13} /> Open in Google Docs
                    </a>
                  )}
                </div>

                {entriesLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
                  </div>
                ) : entries.length === 0 ? (
                  <p className="text-[#4b5563] text-sm">No entries in this brief yet.</p>
                ) : (
                  <>
                    {highPriority.length > 0 && (
                      <BriefSection title="High Priority" entries={highPriority} accent="red" />
                    )}
                    {watchlist.length > 0 && (
                      <BriefSection title="Watchlist" entries={watchlist} accent="amber" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BriefSection({
  title,
  entries,
  accent,
}: {
  title: string;
  entries: BriefEntry[];
  accent: 'red' | 'amber';
}) {
  const accentClass = accent === 'red' ? 'text-red-400' : 'text-amber-400';
  return (
    <div>
      <h3 className={`text-[11px] font-semibold uppercase tracking-wide mb-3 ${accentClass}`}>{title}</h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#f1f5f9]">
                  {entry.radar_clusters?.canonical_headline ?? 'Unknown topic'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-bold text-[#f1f5f9]">{entry.score}</span>
                  {entry.radar_clusters?.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#161625] text-[#4b5563] border border-[#2a2a45]">{tag}</span>
                  ))}
                </div>

                {entry.why_flagged && (
                  <p className="text-[12px] text-[#94a3b8] mt-2">
                    <span className="text-[#4b5563] font-medium">Why flagged: </span>{entry.why_flagged}
                  </p>
                )}
                {entry.what_happened && (
                  <p className="text-[12px] text-[#94a3b8] mt-1">
                    <span className="text-[#4b5563] font-medium">What happened: </span>{entry.what_happened}
                  </p>
                )}
                {entry.suggested_angle && (
                  <div className="mt-2 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                    <p className="text-[11px] text-indigo-400 font-medium">Suggested angle</p>
                    <p className="text-[12px] text-[#94a3b8] mt-0.5">{entry.suggested_angle}</p>
                  </div>
                )}
                {entry.source_links?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {entry.source_links.slice(0, 3).map((link, i) => {
                      const [sourceName, url] = link.split(': ');
                      return url ? (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-[#4b5563] hover:text-indigo-400">
                          <ExternalLink size={9} /> {sourceName}
                        </a>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <span className="text-2xl font-bold text-[#f1f5f9] shrink-0">{entry.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
