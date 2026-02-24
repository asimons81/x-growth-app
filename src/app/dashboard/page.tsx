"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dataApi } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  PenLine,
  Lightbulb,
  Calendar,
  Mic,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Target,
  Flame,
  Clock,
  Plus,
} from "lucide-react";

interface DashboardStats {
  totalDrafts: number;
  scheduledPosts: number;
  ideasCount: number;
  hooksCount: number;
  voiceProfileReady: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  href: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, color, bgColor, href, loading }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:border-[#2a2a45] cursor-pointer group transition-all duration-200 hover:-translate-y-0.5">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
            <Icon size={18} className={color} />
          </div>
          <ArrowUpRight size={14} className="text-[#4b5563] group-hover:text-[#94a3b8] transition-colors" />
        </div>
        {loading ? (
          <Skeleton height={32} width="60%" className="mb-1" />
        ) : (
          <p className="text-3xl font-bold text-[#f1f5f9] mb-1">{value}</p>
        )}
        <p className="text-sm text-[#94a3b8]">{label}</p>
      </Card>
    </Link>
  );
}

function StreakCard({ loading }: { loading: boolean }) {
  const [streak, setStreak] = useState(0);
  const [weekGoal] = useState(5);
  const [weekCount, setWeekCount] = useState(0);

  useEffect(() => {
    try {
      const s = parseInt(localStorage.getItem("writing_streak") || "0");
      const wc = parseInt(localStorage.getItem("week_count") || "0");
      setStreak(s);
      setWeekCount(wc);
    } catch {}
  }, []);

  const pct = Math.min(100, Math.round((weekCount / weekGoal) * 100));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Flame size={16} className="text-amber-400" />
          </div>
          <span className="font-semibold text-[#f1f5f9] text-sm">Writing Streak</span>
        </div>
        <Badge variant="warning">{streak} days</Badge>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#94a3b8] mb-1.5">
          <span>Week goal</span>
          <span>{weekCount}/{weekGoal} posts</span>
        </div>
        <div className="h-2 bg-[#1c1c2e] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-[#4b5563]">
        {weekCount >= weekGoal
          ? "Week goal reached! 🎉"
          : `${weekGoal - weekCount} more post${weekGoal - weekCount !== 1 ? "s" : ""} to hit your goal`}
      </p>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
        <Zap size={14} className="text-indigo-400" />
        Quick Actions
      </p>
      <div className="space-y-2">
        <Link href="/compose">
          <Button variant="primary" fullWidth size="sm" className="justify-start gap-2">
            <PenLine size={14} />
            Write new post
          </Button>
        </Link>
        <Link href="/ideas">
          <Button variant="secondary" fullWidth size="sm" className="justify-start gap-2">
            <Lightbulb size={14} />
            Capture idea
          </Button>
        </Link>
        <Link href="/hooks">
          <Button variant="secondary" fullWidth size="sm" className="justify-start gap-2">
            <Zap size={14} />
            Generate hooks
          </Button>
        </Link>
        <Link href="/repurpose">
          <Button variant="secondary" fullWidth size="sm" className="justify-start gap-2">
            <Target size={14} />
            Repurpose content
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function VoiceProfileCard({ ready, loading }: { ready: boolean; loading: boolean }) {
  return (
    <Card className={`p-5 ${ready ? "" : "border-amber-500/20"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ready ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
            <Mic size={16} className={ready ? "text-emerald-400" : "text-amber-400"} />
          </div>
          <span className="font-semibold text-[#f1f5f9] text-sm">Voice Profile</span>
        </div>
        {loading ? (
          <Skeleton height={20} width={60} />
        ) : (
          <Badge variant={ready ? "success" : "warning"}>{ready ? "Active" : "Not set"}</Badge>
        )}
      </div>
      <p className="text-xs text-[#94a3b8] mb-3">
        {ready
          ? "AI will write in your unique tone and style."
          : "Train AI on your writing style to generate posts that sound like you."}
      </p>
      <Link href="/library/voice">
        <Button variant={ready ? "ghost" : "outline"} size="sm" fullWidth>
          {ready ? "Update profile" : "Set up now →"}
        </Button>
      </Link>
    </Card>
  );
}

function UpNextCard({ count, loading }: { count: number; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Clock size={16} className="text-indigo-400" />
          </div>
          <span className="font-semibold text-[#f1f5f9] text-sm">Scheduled Queue</span>
        </div>
        {loading ? (
          <Skeleton height={20} width={40} />
        ) : (
          <span className="text-2xl font-bold text-indigo-400">{count}</span>
        )}
      </div>
      <p className="text-xs text-[#94a3b8] mb-3">
        {count === 0 ? "Nothing in queue. Schedule some posts!" : `${count} post${count !== 1 ? "s" : ""} scheduled and ready.`}
      </p>
      <Link href="/schedule">
        <Button variant="ghost" size="sm" fullWidth className="gap-2">
          <Plus size={14} />
          Add to queue
        </Button>
      </Link>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDrafts: 0,
    scheduledPosts: 0,
    ideasCount: 0,
    hooksCount: 0,
    voiceProfileReady: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [drafts, schedule, ideas, hooks] = await Promise.all([
          dataApi.getDrafts(),
          dataApi.getSchedule(),
          dataApi.getIdeas(),
          dataApi.getHooks(),
        ]);

        let voiceProfileReady = false;
        try {
          voiceProfileReady = !!localStorage.getItem("voice_profile");
        } catch {}

        setStats({
          totalDrafts: drafts.length,
          scheduledPosts: schedule.length,
          ideasCount: ideas.length,
          hooksCount: hooks.length,
          voiceProfileReady,
        });
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Your X growth command center"
        icon={<TrendingUp size={18} />}
        action={
          <Link href="/compose">
            <Button size="md" className="gap-2">
              <PenLine size={15} />
              New Post
            </Button>
          </Link>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Drafts"
          value={stats.totalDrafts}
          icon={PenLine}
          color="text-indigo-400"
          bgColor="bg-indigo-500/10"
          href="/library/drafts"
          loading={loading}
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduledPosts}
          icon={Calendar}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
          href="/schedule"
          loading={loading}
        />
        <StatCard
          label="Ideas"
          value={stats.ideasCount}
          icon={Lightbulb}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
          href="/ideas"
          loading={loading}
        />
        <StatCard
          label="Hooks"
          value={stats.hooksCount}
          icon={Zap}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
          href="/library/hooks"
          loading={loading}
        />
      </div>

      {/* Secondary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickActionsCard />
        <StreakCard loading={loading} />
        <VoiceProfileCard ready={stats.voiceProfileReady} loading={loading} />
      </div>

      {/* Up next */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <UpNextCard count={stats.scheduledPosts} loading={loading} />

        {/* Getting started card */}
        <Card className="p-5">
          <p className="text-sm font-semibold text-[#f1f5f9] mb-3 flex items-center gap-2">
            <Target size={14} className="text-purple-400" />
            Getting started
          </p>
          <ol className="space-y-2">
            {[
              { step: "Add your Gemini API key", href: "/settings", done: false },
              { step: "Set up your voice profile", href: "/library/voice", done: stats.voiceProfileReady },
              { step: "Capture your first idea", href: "/ideas", done: stats.ideasCount > 0 },
              { step: "Generate your first draft", href: "/compose", done: stats.totalDrafts > 0 },
              { step: "Schedule a post", href: "/schedule", done: stats.scheduledPosts > 0 },
            ].map(({ step, href, done }) => (
              <li key={step}>
                <Link href={href} className="flex items-center gap-2.5 text-sm group">
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      done
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-[#2a2a45] group-hover:border-indigo-500"
                    }`}
                  >
                    {done && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={done ? "line-through text-[#4b5563]" : "text-[#94a3b8] group-hover:text-[#f1f5f9] transition-colors"}>
                    {step}
                  </span>
                  {!done && <ArrowUpRight size={12} className="ml-auto text-[#4b5563] group-hover:text-indigo-400 transition-colors" />}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
