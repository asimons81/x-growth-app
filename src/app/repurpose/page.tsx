"use client";

import { useState } from "react";
import { withUserHeaders } from "@/lib/client-user";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import toast from "react-hot-toast";
import {
  Shuffle,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  AlignLeft,
  List,
  Quote,
  MessageSquare,
  Mail,
  Twitter,
} from "lucide-react";

const FORMATS = [
  {
    id: "short",
    label: "Short version",
    description: "Compressed to the core insight",
    icon: AlignLeft,
    color: "indigo",
  },
  {
    id: "thread",
    label: "Thread",
    description: "Expanded into a multi-tweet thread",
    icon: List,
    color: "purple",
  },
  {
    id: "quote",
    label: "Quote tweet",
    description: "Framed as a quotable one-liner",
    icon: Quote,
    color: "cyan",
  },
  {
    id: "reply",
    label: "Reply bait",
    description: "Rewritten to invite discussion",
    icon: MessageSquare,
    color: "success",
  },
  {
    id: "newsletter",
    label: "Newsletter intro",
    description: "Expanded for email newsletter",
    icon: Mail,
    color: "warning",
  },
];

interface RepurposedVariant {
  format: string;
  content: string;
}

function VariantCard({ variant }: { variant: RepurposedVariant }) {
  const [copied, setCopied] = useState(false);
  const format = FORMATS.find((f) => f.id === variant.format);
  if (!format) return null;

  const Icon = format.icon;

  const getBadgeVariant = (color: string): Parameters<typeof Badge>[0]["variant"] => {
    const map: Record<string, Parameters<typeof Badge>[0]["variant"]> = {
      indigo: "indigo",
      purple: "purple",
      cyan: "cyan",
      success: "success",
      warning: "warning",
    };
    return map[color] || "default";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(variant.content);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5 fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-${format.color}-500/10 flex items-center justify-center`}>
            <Icon size={13} className={`text-${format.color}-400`} />
          </div>
          <div>
            <Badge variant={getBadgeVariant(format.color)}>{format.label}</Badge>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-[#22223a] flex items-center justify-center transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[#94a3b8]" />}
        </button>
      </div>
      <p className="text-[#f1f5f9] text-sm leading-relaxed whitespace-pre-wrap">{variant.content}</p>
      <p className="text-xs text-[#4b5563] mt-3">{variant.content.length} chars</p>
    </Card>
  );
}

export default function RepurposePage() {
  const { isAuthenticated } = useAuthUser();
  const [originalPost, setOriginalPost] = useState("");
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["short", "thread", "quote"]);
  const [variants, setVariants] = useState<RepurposedVariant[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleFormat = (id: string) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const repurpose = async () => {
    if (!originalPost.trim() || !isAuthenticated) return;
    if (selectedFormats.length === 0) {
      toast.error("Select at least one format");
      return;
    }

    setLoading(true);
    setVariants([]);

    const formatDescriptions = selectedFormats.map((id) => {
      const f = FORMATS.find((fmt) => fmt.id === id);
      return `${f?.label}: ${f?.description}`;
    });

    const prompt = `Repurpose this X (Twitter) post into ${selectedFormats.length} different formats.

Original post:
"${originalPost}"

Formats to create:
${formatDescriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Return as JSON array: [{ "format": "<format_id>", "content": "<repurposed content>" }]
Format IDs: ${selectedFormats.join(", ")}

Rules:
- "short": Keep the core insight in 1-2 sentences max (under 100 chars)
- "thread": 3-5 tweets separated by "---", each tweet under 280 chars
- "quote": Distill to a powerful one-liner quotable takeaway
- "reply": Rewrite as an open question or statement inviting replies
- "newsletter": Expand with context, examples, and a hook intro paragraph
Keep the author's voice. Make each format feel native to its context.`;

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ topic: prompt, count: 1, mode: "repurpose" }),
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      const rawContent = data.drafts?.[0]?.content || "[]";

      let parsed: RepurposedVariant[] = [];
      try {
        const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: split by format labels
        parsed = selectedFormats.map((fmt) => ({
          format: fmt,
          content: rawContent,
        }));
      }

      const valid = parsed.filter(
        (v) => v.format && v.content?.trim() && selectedFormats.includes(v.format)
      );

      setVariants(valid.length > 0 ? valid : parsed);
      toast.success(`Created ${valid.length || parsed.length} variants!`);
    } catch {
      toast.error("Repurposing failed -- check your API key");
    } finally {
      setLoading(false);
    }
  };

  const charCount = originalPost.length;
  const remaining = 280 - charCount;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Repurpose Engine"
        description="Turn one post into multiple formats"
        icon={<Shuffle size={18} />}
      />

      {!isAuthenticated && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Add your Gemini API key in{" "}
            <a href="/settings" className="underline hover:text-amber-200">Settings</a>{" "}
            to repurpose content.
          </p>
        </div>
      )}

      {/* Input */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-[#94a3b8]">Original post</label>
          <div className="flex items-center gap-2 text-xs text-[#4b5563]">
            <Twitter size={11} />
            <span className={remaining < 0 ? "text-red-400" : remaining < 20 ? "text-amber-400" : ""}>
              {remaining} chars remaining
            </span>
          </div>
        </div>
        <textarea
          value={originalPost}
          onChange={(e) => setOriginalPost(e.target.value)}
          placeholder="Paste your best post here to repurpose it into multiple formats..."
          rows={5}
          className="input-base resize-none mb-4"
        />

        <div className="mb-4">
          <p className="text-xs text-[#94a3b8] mb-2.5 font-medium">Output formats</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {FORMATS.map((fmt) => {
              const selected = selectedFormats.includes(fmt.id);
              const Icon = fmt.icon;
              return (
                <button
                  key={fmt.id}
                  onClick={() => toggleFormat(fmt.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all border ${
                    selected
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                      : "bg-[#1c1c2e] border-[#2a2a45] text-[#94a3b8] hover:border-[#4b5563]"
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-xs font-medium leading-tight">{fmt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={repurpose}
          loading={loading}
          disabled={!originalPost.trim() || !isAuthenticated || selectedFormats.length === 0}
          fullWidth
          className="gap-2"
        >
          <Sparkles size={15} />
          Repurpose ({selectedFormats.length} format{selectedFormats.length !== 1 ? "s" : ""})
        </Button>
      </Card>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {selectedFormats.map((fmt) => (
            <Card key={fmt} className="p-5">
              <div className="skeleton h-5 w-32 rounded-full mb-3" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-4 w-3/5 rounded" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Variants */}
      {variants.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#94a3b8]">{variants.length} variants created</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const all = variants.map((v) => `[${v.format.toUpperCase()}]\n${v.content}`).join("\n\n---\n\n");
                navigator.clipboard.writeText(all);
                toast.success("All variants copied!");
              }}
              className="gap-1.5"
            >
              <Copy size={12} />
              Copy all
            </Button>
          </div>
          {variants.map((v, i) => (
            <VariantCard key={i} variant={v} />
          ))}
        </div>
      )}
    </div>
  );
}
