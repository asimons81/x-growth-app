import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
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
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const features = [
  { href: "/compose", label: "AI Compose", icon: PenLine, description: "Generate drafts that sound like you.", tag: "Smart" },
  { href: "/ideas", label: "Ideas", icon: Lightbulb, description: "Brain dump and expand with AI.", tag: "Focus" },
  { href: "/schedule", label: "Schedule", icon: Calendar, description: "Perfect timing, every time.", tag: "Automate" },
  { href: "/analytics", label: "Analytics", icon: BarChart2, description: "Deep performance tracking.", tag: "Metrics" },
  { href: "/hooks", label: "Hooks", icon: Zap, description: "Stop the scroll with better openers.", tag: "Growth" },
  { href: "/repurpose", label: "Repurpose", icon: Shuffle, description: "One post, infinite formats.", tag: "Speed" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-ui-bg selection:bg-brand-500/30">
      {/* Structural Header */}
      <nav className="sticky top-0 z-50 w-full border-b border-ui-border/50 bg-ui-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
              <TrendingUp size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight text-text-main">GrowthOS</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/dashboard" className="text-sm font-medium text-text-subtle hover:text-text-main transition-colors">Platform</Link>
            <Link href="/library" className="text-sm font-medium text-text-subtle hover:text-text-main transition-colors">Library</Link>
            <Link href="/settings" className="text-sm font-medium text-text-subtle hover:text-text-main transition-colors">Settings</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Modern Hero Section */}
      <section className="relative px-6 pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Subtle grid pattern for texture */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex w-fit items-center rounded-full border border-ui-border bg-ui-surface-elevated px-4 py-1.5 backdrop-blur-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">Next Gen Performance</span>
            <div className="mx-2 h-1 w-1 rounded-full bg-ui-border" />
            <span className="text-[11px] font-medium text-text-subtle">V2.0 Now Live</span>
          </div>
          
          <h1 className="mb-6 text-5xl font-black tracking-tighter text-text-main md:text-7xl lg:text-8xl">
            Scale your presence <br />
            <span className="text-brand-500">without the grind.</span>
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-text-subtle md:text-xl">
            The all-in-one growth operating system for professional creators. 
            Automate the friction, focus on the impact.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto px-10">
                Launch Dashboard
                <ArrowRight size={18} className="ml-1" />
              </Button>
            </Link>
            <Link href="/compose">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Try AI Compose
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid with Modern Cards */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="mb-12 flex items-end justify-between border-b border-ui-border pb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-main">Ecosystem</h2>
            <p className="text-sm text-text-muted">Integrated tools built for speed.</p>
          </div>
          <Link href="/library" className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-400 hover:text-brand-300 transition-colors">
            View All Tools
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full hover:border-brand-500/40 hover:-translate-y-1">
                <CardContent className="flex h-full flex-col p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ui-surface-elevated text-brand-400 border border-ui-border shadow-inner">
                      <feature.icon size={24} />
                    </div>
                    <span className="rounded-lg bg-ui-surface-elevated px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-text-muted border border-ui-border">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-text-main">{feature.label}</h3>
                  <p className="mb-8 text-sm leading-relaxed text-text-subtle">
                    {feature.description}
                  </p>
                  <div className="mt-auto flex items-center gap-1 text-sm font-semibold text-brand-400 group">
                    Get Started 
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="border-t border-ui-border bg-ui-surface/30 px-6 py-12">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5 grayscale opacity-50">
            <TrendingUp size={18} />
            <span className="text-sm font-bold tracking-tight">GrowthOS</span>
          </div>
          <p className="text-xs text-text-muted">© 2026 Nexus Systems. Built for X.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-xs font-medium text-text-muted hover:text-text-main">Privacy</Link>
            <Link href="#" className="text-xs font-medium text-text-muted hover:text-text-main">Terms</Link>
            <Link href="#" className="text-xs font-medium text-text-muted hover:text-text-main">GitHub</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
