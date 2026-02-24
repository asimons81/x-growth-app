"use client";

import { useState } from "react";
import { withUserHeaders } from "@/lib/client-user";
import { useAuthUser } from "@/hooks/useAuthUser";
import { dataApi } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import {
  Zap,
  Sparkles,
  Copy,
  Check,
  BookmarkPlus,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const HOOK_TYPES = [
  { id: "question", label: "Question", color: "indigo", example: "Did you know that...?" },
  { id: "stat", label: "Statistic", color: "purple", example: "X% of people never..." },
  { id: "story", label: "Story", color: "cyan", example: "3 years ago I was..." },
  { id: "contrarian", label: "Contrarian", color: "warning", example: "Everyone says X but..." },
  { id: "list", label: "List", color: "success", example: "5 things that changed..." },
  { id: "mistake", label: "Mistake", color: "error", example: "The biggest mistake I made was..." },
  { id: "secret", label: "Secret", color: "purple", example: "No one talks about this..." },
  { id: "bold", label: "Bold claim", color: "indigo", example: "X is completely broken." },
];

interface GeneratedHook {
  type: string;
  hook: string;
}

function HookCard({
  hook,
  onSave,
  saving,
}: {
  hook: GeneratedHook;
  onSave: (hook: GeneratedHook) => void;
  saving: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const typeInfo = HOOK_TYPES.find((t) => t.id === hook.type) || HOOK_TYPES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(hook.hook);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeVariant = (color: string) => {
    const map: Record<string, Parameters<typeof Badge>[0]["variant"]> = {
      indigo: "indigo",
      purple: "purple",
      cyan: "cyan",
      warning: "warning",
      success: "success",
      error: "error",
    };
    return map[color] || "default";
  };

  return (
    <Card className="p-4 group hover:border-[#2a2a45] fade-in">
      <div className="flex items-start justify-between mb-2">
        <Badge variant={getBadgeVariant(typeInfo.color)}>{typeInfo.label}</Badge>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-[#22223a] flex items-center justify-center transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[#94a3b8]" />}
          </button>
          <button
            onClick={() => onSave(hook)}
            disabled={saving}
            className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-indigo-500/20 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <BookmarkPlus size={12} className="text-indigo-400" />
          </button>
        </div>
      </div>
      <p className="text-[#f1f5f9] text-sm leading-relaxed">{hook.hook}</p>
    </Card>
  );
}

export default function HookGeneratorPage() {
  const { isAuthenticated } = useAuthUser();
  const [topic, setTopic] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["question", "stat", "story", "contrarian"]);
  const [hooks, setHooks] = useState<GeneratedHook[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingHooks, setSavingHooks] = useState<Set<string>>(new Set());

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    if (!topic.trim() || !isAuthenticated) return;
    if (selectedTypes.length === 0) {
      toast.error("Select at least one hook type");
      return;
    }

    setLoading(true);
    setHooks([]);

    try {
      const typeNames = selectedTypes.map((t) => HOOK_TYPES.find((ht) => ht.id === t)?.label || t);

      const prompt = `Generate ${selectedTypes.length * 2} diverse tweet hooks for the topic: "${topic}".

Hook types to generate: ${typeNames.join(", ")}.

For each hook type, create 2 variations. Each hook should be a single sentence or two that grabs attention immediately. Output as JSON array with objects: { "type": "<hookTypeId>", "hook": "<hook text>" }

Hook type IDs: ${selectedTypes.join(", ")}

Make hooks punchy, specific, and scroll-stopping. No generic phrases.`;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          topic: prompt,
          count: 1,
          mode: "hooks",
        }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();

      // Parse hooks from AI response
      const rawContent = data.drafts?.[0]?.content || "[]";
      let parsed: GeneratedHook[] = [];

      try {
        const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: create hook cards from the raw text
        const lines = rawContent
          .split("\n")
          .filter((l: string) => l.trim() && !l.startsWith("{") && !l.startsWith("}") && !l.startsWith("[") && !l.startsWith("]"))
          .slice(0, 8);
        parsed = lines.map((line: string, i: number) => ({
          type: selectedTypes[i % selectedTypes.length],
          hook: line.replace(/^[-**\d.]+\s*/, "").trim(),
        }));
      }

      if (parsed.length === 0) {
        // Last resort: wrap the whole content as one hook
        parsed = [{ type: selectedTypes[0], hook: rawContent.substring(0, 280) }];
      }

      setHooks(parsed.filter((h) => h.hook?.trim()));
      toast.success(`Generated ${parsed.length} hooks!`);
    } catch {
      toast.error("Generation failed -- check your API key");
    } finally {
      setLoading(false);
    }
  };

  const saveHook = async (hook: GeneratedHook) => {
    const key = hook.hook.substring(0, 20);
    setSavingHooks((prev) => new Set(prev).add(key));
    try {
      await dataApi.createHook(hook.hook, hook.type);
      toast.success("Hook saved to library!");
    } catch {
      toast.error("Failed to save hook");
    } finally {
      setSavingHooks((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Hook Generator"
        description="Generate scroll-stopping hooks for any topic"
        icon={<Zap size={18} />}
      />

      {!isAuthenticated && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Add your Gemini API key in{" "}
            <a href="/settings" className="underline hover:text-amber-200">Settings</a>{" "}
            to generate hooks.
          </p>
        </div>
      )}

      {/* Input form */}
      <Card className="p-5 mb-6">
        <label className="block text-sm font-medium text-[#94a3b8] mb-3">Topic or niche</label>
        <div className="flex gap-3 mb-5">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="e.g. productivity systems, indie hacking, learning in public..."
            className="input-base flex-1"
          />
          <Button
            onClick={generate}
            loading={loading}
            disabled={!topic.trim() || !isAuthenticated}
            className="gap-2 shrink-0"
          >
            <Sparkles size={15} />
            Generate
          </Button>
        </div>

        <div>
          <p className="text-xs text-[#94a3b8] mb-2.5 font-medium">Hook types to generate</p>
          <div className="flex flex-wrap gap-2">
            {HOOK_TYPES.map((type) => {
              const selected = selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleType(type.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selected
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45] hover:border-[#4b5563]"
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Tips */}
      {hooks.length === 0 && !loading && (
        <Card className="p-5 mb-6">
          <p className="text-sm font-semibold text-[#f1f5f9] mb-3">Hook writing tips</p>
          <div className="space-y-2">
            {[
              { type: "Question", tip: "Ask something your reader is already wondering" },
              { type: "Statistic", tip: "Use a surprising number that reframes their worldview" },
              { type: "Story", tip: "Start mid-action -- skip the backstory" },
              { type: "Contrarian", tip: "Challenge conventional wisdom with specifics, not just negations" },
            ].map(({ type, tip }) => (
              <div key={type} className="flex gap-3 text-sm">
                <ArrowRight size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#f1f5f9] font-medium">{type}: </span>
                  <span className="text-[#94a3b8]">{tip}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <div className="skeleton h-5 w-20 rounded-full mb-3" />
              <div className="skeleton h-12 w-full rounded" />
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {hooks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#94a3b8]">{hooks.length} hooks generated</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const all = hooks.map((h) => h.hook).join("\n\n");
                navigator.clipboard.writeText(all);
                toast.success("All hooks copied!");
              }}
              className="gap-1.5"
            >
              <Copy size={12} />
              Copy all
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {hooks.map((hook, i) => (
              <HookCard
                key={i}
                hook={hook}
                onSave={saveHook}
                saving={savingHooks.has(hook.hook.substring(0, 20))}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && hooks.length === 0 && topic && (
        <EmptyState
          icon={<Zap size={24} />}
          title="Ready to generate"
          description="Select hook types above and click Generate"
        />
      )}
    </div>
  );
}
