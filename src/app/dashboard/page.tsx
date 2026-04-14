"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dataApi } from "@/lib/data";
import { withUserHeaders } from "@/lib/client-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
  Zap, Shuffle,
  ArrowRight,
  Target,
  Flame,
  Clock,
  Plus,
  ArrowUpRight,
} from "lucide-react";

interface DashboardStats {
  totalDrafts: number;
  scheduledPosts: number;
  ideasCount: number;
  hooksCount: number;
  voiceProfileReady: boolean;
  apiKeyConfigured: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, href, loading }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:border-brand-500/40 hover:-translate-y-1">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ui-surface-elevated text-brand-400 border border-ui-border shadow-inner">
              <Icon size={24} />
            </div>
            <ArrowUpRight size={18} className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          {loading ? (
            <Skeleton height={40} width="60%" className="mb-2" />
          ) : (
            <p className="text-4xl font-black tracking-tighter text-text-main mb-1">{value}</p>
          )}
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StreakCard() {
  const [streak] = useState(7);
  const [weekGoal] = useState(5);
  const [weekCount] = useState(3);

  const pct = Math.min(100, Math.round((weekCount / weekGoal) * 100));

  return (
    <Card elevated>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Flame size={20} />
            </div>
            <CardTitle>Consistency</CardTitle>
          </div>
          <Badge variant="warning">{streak} day streak</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
            <span>Weekly Progress</span>
            <span className="text-text-main">{weekCount} / {weekGoal} posts</span>
          </div>
          <div className="h-2.5 bg-ui-surface rounded-full overflow-hidden border border-ui-border">
            <div
              className="h-full rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <p className="text-sm font-medium text-text-subtle leading-relaxed">
          {weekCount >= weekGoal
            ? "You've crushed your weekly goal. Keep the momentum going."
            : `Draft ${weekGoal - weekCount} more post${weekGoal - weekCount !== 1 ? "s" : ""} to maintain your trajectory.`}
        </p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await dataApi.getDashboardStats(withUserHeaders());
        setStats(response);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <main className="min-h-screen bg-ui-bg p-6 md:p-12 lg:p-16">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Engine Room"
          description="Operational overview of your content pipeline."
          icon={<TrendingUp size={24} />}
          action={
            <Link href="/compose">
              <Button size="md" className="gap-2">
                <Plus size={18} />
                New Post
              </Button>
            </Link>
          }
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <StatCard
                label="Drafts Ready"
                value={stats?.totalDrafts || 0}
                icon={PenLine}
                href="/compose"
                loading={loading}
              />
              <StatCard
                label="Active Ideas"
                value={stats?.ideasCount || 0}
                icon={Lightbulb}
                href="/ideas"
                loading={loading}
              />
              <StatCard
                label="Scheduled"
                value={stats?.scheduledPosts || 0}
                icon={Calendar}
                href="/schedule"
                loading={loading}
              />
              <StatCard
                label="Hook Library"
                value={stats?.hooksCount || 0}
                icon={Zap}
                href="/hooks"
                loading={loading}
              />
            </div>

            <Card elevated>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                      <Clock size={20} />
                    </div>
                    <CardTitle>Recent Activity</CardTitle>
                  </div>
                  <Link href="/library">
                    <Button variant="ghost" size="sm">View History</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ui-surface-elevated text-text-muted border border-ui-border">
                  <TrendingUp size={32} />
                </div>
                <h4 className="mb-2 text-lg font-bold text-text-main">No recent updates</h4>
                <p className="max-w-xs text-sm text-text-muted">
                  Your growth metrics will appear here once you start shipping content.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <StreakCard />
            
            <Card elevated className="border-brand-500/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
                    <Zap size={20} />
                  </div>
                  <CardTitle>Growth Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/compose" className="block">
                  <Button variant="secondary" fullWidth className="justify-start px-6">
                    <PenLine size={18} className="mr-3 text-brand-400" />
                    Draft New Post
                  </Button>
                </Link>
                <Link href="/repurpose" className="block">
                  <Button variant="secondary" fullWidth className="justify-start px-6">
                    <Shuffle size={18} className="mr-3 text-cyan-400" />
                    Repurpose Content
                  </Button>
                </Link>
                <Link href="/radar" className="block">
                  <Button variant="secondary" fullWidth className="justify-start px-6">
                    <Target size={18} className="mr-3 text-emerald-400" />
                    Competitor Radar
                  </Button>
                </Link>
                <Link href="/library/voice" className="block">
                  <Button variant="secondary" fullWidth className="justify-start px-6">
                    <Mic size={18} className="mr-3 text-purple-400" />
                    Refine Voice Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
