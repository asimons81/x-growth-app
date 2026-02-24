"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { withUserHeaders } from "@/lib/client-user";
import toast from "react-hot-toast";
import {
  BarChart2,
  TrendingUp,
  Heart,
  Eye,
  MessageCircle,
  Repeat2,
  Upload,
  Info,
} from "lucide-react";

interface PostAnalytics {
  id: string;
  content: string;
  posted_at: string;
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
  engagement_rate?: number;
}

interface DayData {
  date: string;
  impressions: number;
  likes: number;
  replies: number;
  retweets: number;
  posts: number;
}

const CHART_COLORS = {
  impressions: "#6366f1",
  likes: "#ec4899",
  replies: "#10b981",
  retweets: "#f59e0b",
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161625] border border-[#2a2a45] rounded-xl p-3 shadow-xl">
      <p className="text-xs text-[#94a3b8] mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-[#94a3b8] capitalize">{entry.name}:</span>
          <span className="text-[#f1f5f9] font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

function StatTile({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <Card className="p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-[#f1f5f9]">{value.toLocaleString()}</p>
      <p className="text-sm text-[#94a3b8]">{label}</p>
    </Card>
  );
}

function TopPostCard({ post, rank }: { post: PostAnalytics; rank: number }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e35] hover:border-[#2a2a45] transition-colors">
      <span className="text-lg font-bold text-[#4b5563] shrink-0 w-6 text-center leading-none mt-0.5">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#f1f5f9] line-clamp-2 mb-2">{post.content}</p>
        <div className="flex flex-wrap gap-3 text-xs text-[#4b5563]">
          <span className="flex items-center gap-1">
            <Eye size={11} className="text-indigo-400" />
            {(post.impressions || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={11} className="text-pink-400" />
            {(post.likes || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={11} className="text-emerald-400" />
            {(post.replies || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Repeat2 size={11} className="text-amber-400" />
            {(post.retweets || 0).toLocaleString()}
          </span>
          {post.engagement_rate !== undefined && (
            <Badge variant="indigo">{post.engagement_rate.toFixed(1)}% ER</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<PostAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [activeMetric, setActiveMetric] = useState<"impressions" | "likes" | "replies" | "retweets">(
    "impressions"
  );

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data?type=posts", {
        headers: withUserHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const enriched = (data || []).map((p: PostAnalytics) => ({
          ...p,
          engagement_rate:
            p.impressions > 0
              ? (((p.likes || 0) + (p.replies || 0) + (p.retweets || 0)) / p.impressions) * 100
              : 0,
        }));
        setPosts(enriched);
      }
    } catch {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "posts");
      const res = await fetch("/api/import", {
        method: "POST",
        headers: withUserHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Imported ${data.imported} posts!`);
      await loadPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  // Aggregate by day for chart
  const chartData = (() => {
    const map: Record<string, DayData> = {};
    posts
      .filter((p) => p.posted_at)
      .forEach((p) => {
        const day = new Date(p.posted_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!map[day]) {
          map[day] = { date: day, impressions: 0, likes: 0, replies: 0, retweets: 0, posts: 0 };
        }
        map[day].impressions += p.impressions || 0;
        map[day].likes += p.likes || 0;
        map[day].replies += p.replies || 0;
        map[day].retweets += p.retweets || 0;
        map[day].posts += 1;
      });
    return Object.values(map)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);
  })();

  const totals = posts.reduce(
    (acc, p) => ({
      impressions: acc.impressions + (p.impressions || 0),
      likes: acc.likes + (p.likes || 0),
      replies: acc.replies + (p.replies || 0),
      retweets: acc.retweets + (p.retweets || 0),
    }),
    { impressions: 0, likes: 0, replies: 0, retweets: 0 }
  );

  const topPosts = [...posts]
    .sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
    .slice(0, 5);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <PageHeader
        title="Analytics"
        description="Track performance from imported X data"
        icon={<BarChart2 size={18} />}
        action={
          <div>
            <input
              type="file"
              accept=".csv"
              id="analytics-import"
              className="hidden"
              onChange={handleImport}
              disabled={importing}
            />
            <label htmlFor="analytics-import" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl font-medium bg-[#1c1c2e] text-[#f1f5f9] border border-[#2a2a45] hover:bg-[#22223a] hover:border-[#4f46e5] transition-colors cursor-pointer">
                {importing ? (
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Upload size={13} />
                )}
                Import CSV
              </div>
            </label>
          </div>
        }
      />

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-2 text-xs text-[#94a3b8] p-3 bg-[#0f0f1a] rounded-xl border border-[#1e1e35]">
        <Info size={13} className="text-indigo-400 shrink-0 mt-0.5" />
        Import your X analytics CSV (from X Analytics dashboard) to visualize performance. Format: content, posted_at, impressions, likes, replies, retweets
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5">
              <div className="skeleton h-9 w-9 rounded-xl mb-3" />
              <div className="skeleton h-7 w-20 rounded mb-1" />
              <div className="skeleton h-4 w-24 rounded" />
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<BarChart2 size={28} />}
          title="No analytics data yet"
          description="Import your X analytics CSV to see charts, top posts, and engagement trends."
          action={
            <label htmlFor="analytics-import" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl font-medium btn-gradient cursor-pointer">
                <Upload size={14} />
                Import CSV
              </div>
            </label>
          }
        />
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatTile label="Total Impressions" value={totals.impressions} icon={Eye} color="text-indigo-400" bg="bg-indigo-500/10" />
            <StatTile label="Total Likes" value={totals.likes} icon={Heart} color="text-pink-400" bg="bg-pink-500/10" />
            <StatTile label="Total Replies" value={totals.replies} icon={MessageCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
            <StatTile label="Total Retweets" value={totals.retweets} icon={Repeat2} color="text-amber-400" bg="bg-amber-500/10" />
          </div>

          {/* Performance over time */}
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-400" />
                <span className="font-semibold text-[#f1f5f9] text-sm">Performance over time</span>
              </div>
              <div className="flex gap-1">
                {(["impressions", "likes", "replies", "retweets"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setActiveMetric(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                      activeMetric === m
                        ? "text-indigo-300 bg-indigo-500/20 border border-indigo-500/30"
                        : "text-[#4b5563] hover:text-[#94a3b8]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
                <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={CHART_COLORS[activeMetric]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS[activeMetric] }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Daily posts bar chart */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={14} className="text-purple-400" />
                <span className="font-semibold text-[#f1f5f9] text-sm">Posts per day</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
                  <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4b5563", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="posts" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Engagement breakdown */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Heart size={14} className="text-pink-400" />
                <span className="font-semibold text-[#f1f5f9] text-sm">Engagement breakdown</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData.slice(-14)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
                  <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4b5563", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="likes" fill="#ec4899" radius={[2, 2, 0, 0]} stackId="a" />
                  <Bar dataKey="replies" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="retweets" fill="#f59e0b" radius={[0, 0, 2, 2]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top posts */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="font-semibold text-[#f1f5f9] text-sm">Top performing posts</span>
              <span className="text-xs text-[#4b5563]">(by engagement rate)</span>
            </div>
            <div className="space-y-3">
              {topPosts.map((post, i) => (
                <TopPostCard key={post.id} post={post} rank={i + 1} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
