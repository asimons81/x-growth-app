import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  TrendingUp,
  PenLine,
  Lightbulb,
  Calendar,
  BookOpen,
  BarChart2,
  Zap,
  Shuffle,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const features = [
  { href: "/compose", label: "Compose", icon: PenLine, description: "Generate AI drafts in your voice", color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { href: "/ideas", label: "Ideas", icon: Lightbulb, description: "Brain dump and expand ideas with AI", color: "text-amber-400", bg: "bg-amber-500/10" },
  { href: "/schedule", label: "Schedule", icon: Calendar, description: "Queue posts for the perfect time", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { href: "/analytics", label: "Analytics", icon: BarChart2, description: "Track performance and trends", color: "text-purple-400", bg: "bg-purple-500/10" },
  { href: "/hooks", label: "Hook Generator", icon: Zap, description: "Create scroll-stopping openers", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { href: "/repurpose", label: "Repurpose", icon: Shuffle, description: "Turn one post into many formats", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { href: "/library", label: "Library", icon: BookOpen, description: "Your hooks, voice, topics and drafts", color: "text-pink-400", bg: "bg-pink-500/10" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden px-6 pt-20 pb-16 lg:pt-28 lg:pb-20">
        {/* Glow background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(139,92,246,0.08) 0%, transparent 50%)",
          }}
        />

        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-bold text-[#f1f5f9]">GrowthOS</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium ml-1">
              for X
            </span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-[#f1f5f9] leading-tight mb-4">
            Your AI-powered X{" "}
            <span className="gradient-text">growth operating system</span>
          </h1>
          <p className="text-lg text-[#94a3b8] max-w-2xl mb-8">
            Generate posts in your voice, build hooks that convert, track performance, and
            schedule content — all in one place. Free forever.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                <Sparkles size={18} />
                Open Dashboard
              </Button>
            </Link>
            <Link href="/compose">
              <Button variant="secondary" size="lg" className="gap-2">
                <PenLine size={18} />
                Start writing
                <ChevronRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="px-6 pb-16 max-w-4xl mx-auto lg:ml-[240px] lg:max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4b5563] mb-4">All features</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href}>
                <Card className="p-5 cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${feature.bg}`}>
                      <Icon size={16} className={feature.color} />
                    </div>
                    <ArrowUpRight
                      size={13}
                      className="text-[#4b5563] group-hover:text-[#94a3b8] transition-colors"
                    />
                  </div>
                  <p className="font-semibold text-[#f1f5f9] text-sm mb-1">{feature.label}</p>
                  <p className="text-xs text-[#94a3b8]">{feature.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Quick start */}
        <Card className="mt-8 p-6">
          <h3 className="font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-400" />
            Quick start guide
          </h3>
          <ol className="space-y-3">
            {[
              { step: "Go to Settings and add your Gemini API key", href: "/settings" },
              { step: "Build your Voice Profile from sample posts", href: "/library/voice" },
              { step: "Brain-dump some content ideas", href: "/ideas" },
              { step: "Generate your first AI-drafted post", href: "/compose" },
              { step: "Schedule it and track your growth", href: "/schedule" },
            ].map(({ step, href }, i) => (
              <li key={i}>
                <Link
                  href={href}
                  className="flex items-start gap-3 group"
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-xs text-indigo-400 font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-[#94a3b8] group-hover:text-[#f1f5f9] transition-colors pt-0.5">
                    {step}
                  </span>
                  <ChevronRight
                    size={14}
                    className="text-[#4b5563] group-hover:text-indigo-400 transition-colors ml-auto mt-0.5 shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
