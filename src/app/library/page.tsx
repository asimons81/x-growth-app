import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { BookOpen, Lightbulb, Mic, Zap, Tag, FileText, ArrowUpRight } from "lucide-react";

const sections = [
  {
    href: "/library/voice",
    label: "Voice Profile",
    description: "Train AI on your unique writing style and tone",
    icon: Mic,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    accent: "#8b5cf6",
  },
  {
    href: "/library/hooks",
    label: "Hooks",
    description: "Your collection of high-performing tweet hooks",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    accent: "#f59e0b",
  },
  {
    href: "/library/topics",
    label: "Topics",
    description: "Categories and niches you post about",
    icon: Tag,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    accent: "#06b6d4",
  },
  {
    href: "/library/drafts",
    label: "Saved Drafts",
    description: "Your draft post collection, ready to polish",
    icon: FileText,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    accent: "#6366f1",
  },
  {
    href: "/ideas",
    label: "Ideas",
    description: "Brain dump content ideas and expand them with AI",
    icon: Lightbulb,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    accent: "#10b981",
  },
];

export default function LibraryPage() {
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Library"
        description="Your content assets and creative arsenal"
        icon={<BookOpen size={18} />}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.bg}`}>
                    <Icon size={18} className={section.color} />
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-[#4b5563] group-hover:text-[#94a3b8] transition-colors"
                  />
                </div>
                <h3 className="font-semibold text-[#f1f5f9] mb-1.5">{section.label}</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{section.description}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
