"use client";

import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  canonical_url: string;
  source_name: string;
  source_category: string;
  published_at: string | null;
  fetched_at: string;
  author: string | null;
  excerpt: string | null;
  tags: string[];
  cluster_id: string | null;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  return `${m}m ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Search': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'SEO': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'Social': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'WordPress': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Publishing': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Creator Economy': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Big Tech': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Tools': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export default function LiveFeedPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [total, setTotal] = useState(0);

  async function fetchArticles() {
    setLoading(true);
    const res = await fetch('/api/radar/live?limit=100');
    const data = await res.json() as { data?: Article[]; count?: number };
    setArticles(data.data ?? []);
    setTotal(data.count ?? 0);
    setLoading(false);
  }

  useEffect(() => { fetchArticles(); }, []);

  const categories = ['all', ...new Set(articles.map((a) => a.source_category).filter(Boolean))].sort();
  const filtered = categoryFilter === 'all' ? articles : articles.filter((a) => a.source_category === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Live Feed</h1>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">{total} articles ingested</p>
        </div>
        <button
          onClick={fetchArticles}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a45] text-[13px] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-indigo-500/30 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Category filter pills */}
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
          {[...Array(10)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#4b5563]">No articles yet. Run the pipeline to ingest sources.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((article) => (
            <div key={article.id} className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35] hover:border-[#2a2a45] transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <a
                    href={article.canonical_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[14px] font-medium text-[#f1f5f9] hover:text-indigo-300 transition-colors"
                  >
                    <span className="line-clamp-1">{article.title}</span>
                    <ExternalLink size={11} className="shrink-0 opacity-50" />
                  </a>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-[12px] font-medium text-[#94a3b8]">{article.source_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${CATEGORY_COLORS[article.source_category] ?? 'text-[#94a3b8] bg-[#1c1c2e] border-[#2a2a45]'}`}>
                      {article.source_category}
                    </span>
                    {article.published_at && (
                      <span className="text-[11px] text-[#4b5563]">{timeAgo(article.published_at)}</span>
                    )}
                    {article.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#161625] text-[#4b5563] border border-[#2a2a45]">{tag}</span>
                    ))}
                    {article.cluster_id && (
                      <a
                        href={`/radar/clusters/${article.cluster_id}`}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        → cluster
                      </a>
                    )}
                  </div>
                  {article.excerpt && (
                    <p className="text-[12px] text-[#4b5563] mt-1.5 line-clamp-2">{article.excerpt}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#4b5563] shrink-0 mt-0.5">{timeAgo(article.fetched_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
