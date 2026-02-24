"use client";

import { useState, useEffect } from "react";
import { dataApi } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import { Calendar, Clock, Plus, Trash2, CalendarDays } from "lucide-react";
import Link from "next/link";

interface ScheduledPost {
  id: string;
  posts: { content: string };
  scheduled_for: string;
  status: string;
}

function formatScheduledTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor(diff / 3600000);

  const timeStr = d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let relStr = "";
  if (diff < 0) relStr = "Overdue";
  else if (hrs < 1) relStr = "Less than 1h";
  else if (hrs < 24) relStr = `In ${hrs}h`;
  else if (days === 1) relStr = "Tomorrow";
  else relStr = `In ${days} days`;

  return { timeStr, relStr, isOverdue: diff < 0 };
}

export default function SchedulePage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getSchedule();
      setPosts(data);
    } catch {
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const addToQueue = async () => {
    if (!newPost.trim() || !scheduledTime) return;
    setAdding(true);
    try {
      const saved = await dataApi.createSchedule(newPost.trim(), scheduledTime);
      setPosts(
        [...posts, saved].sort(
          (a, b) =>
            new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
        )
      );
      setNewPost("");
      setScheduledTime("");
      toast.success("Post scheduled!");
    } catch {
      toast.error("Failed to schedule post");
    } finally {
      setAdding(false);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await dataApi.deleteSchedule(id);
      setPosts(posts.filter((p) => p.id !== id));
      toast.success("Removed from queue");
    } catch {
      toast.error("Failed to remove post");
    }
  };

  const queuedPosts = posts
    .filter((p) => p.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
    );

  const upcomingCount = queuedPosts.filter(
    (p) => new Date(p.scheduled_for) > new Date()
  ).length;

  const overdueCount = queuedPosts.filter(
    (p) => new Date(p.scheduled_for) <= new Date()
  ).length;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Schedule"
        description="Queue posts for the perfect time"
        icon={<Calendar size={18} />}
        action={
          <Link href="/calendar">
            <Button variant="secondary" size="sm" className="gap-2">
              <CalendarDays size={13} />
              Calendar view
            </Button>
          </Link>
        }
      />

      {/* Stats row */}
      {!loading && queuedPosts.length > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0f0f1a] rounded-xl border border-[#1e1e35]">
            <Clock size={13} className="text-indigo-400" />
            <span className="text-sm text-[#94a3b8]">{upcomingCount} upcoming</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 rounded-xl border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm text-red-400">{overdueCount} overdue</span>
            </div>
          )}
        </div>
      )}

      {/* Add to queue */}
      <Card className="p-5 mb-6">
        <p className="text-sm font-medium text-[#94a3b8] mb-3">Add to queue</p>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Write your post here, or paste from Compose..."
          rows={3}
          className="input-base resize-none mb-4"
        />

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="input-base pl-8"
            />
          </div>
          <Button
            onClick={addToQueue}
            loading={adding}
            disabled={!newPost.trim() || !scheduledTime}
            className="gap-2 shrink-0"
          >
            <Plus size={14} />
            Schedule
          </Button>
        </div>

        <p className="text-xs text-[#4b5563] mt-2">
          Tip: Generate drafts in{" "}
          <a href="/compose" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Compose
          </a>{" "}
          then paste your favorite here
        </p>
      </Card>

      {/* Queue */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-[#f1f5f9]">
          Queue{" "}
          {queuedPosts.length > 0 && (
            <span className="text-[#4b5563] font-normal ml-1">({queuedPosts.length})</span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="skeleton h-4 w-40 rounded mb-2" />
              <div className="skeleton h-16 w-full rounded" />
            </Card>
          ))}
        </div>
      ) : queuedPosts.length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title="Queue is empty"
          description="Schedule posts above to build your content queue. Consistency is the key to growth."
          action={
            <Link href="/compose">
              <Button className="gap-2">
                <Plus size={14} />
                Generate posts to schedule
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {queuedPosts.map((post) => {
            const { timeStr, relStr, isOverdue } = formatScheduledTime(post.scheduled_for);
            return (
              <Card key={post.id} className={`p-4 ${isOverdue ? "border-red-500/20" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          isOverdue ? "text-red-400" : "text-indigo-400"
                        }`}
                      >
                        <Clock size={12} />
                        {timeStr}
                      </div>
                      <Badge variant={isOverdue ? "error" : "indigo"}>{relStr}</Badge>
                    </div>
                    <p className="text-[#f1f5f9] text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {post.posts?.content}
                    </p>
                    <p className="text-xs text-[#4b5563] mt-2">
                      {post.posts?.content?.length || 0} chars
                    </p>
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-2 text-[#4b5563] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
