"use client";

import { useState, useRef } from "react";
import { withUserHeaders } from "@/lib/client-user";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import {
  PenLine,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
} from "lucide-react";

const TWEET_LIMIT = 280;

interface Draft {
  content: string;
  hook: string;
  angle: string;
}

interface Score {
  hook: number;
  clarity: number;
  novelty: number;
  value: number;
  emotion: number;
  cta: number;
  readability: number;
  authenticity: number;
  overall: number;
  suggestions: string[];
}

interface VoiceProfile {
  commonWords: string[];
  sentenceStarts: string[];
  toneKeywords: string[];
  ctaPatterns: string[];
  formalityScore: number;
  avgPostLength: number;
}

const SCORE_METRICS = ["hook", "clarity", "novelty", "value", "emotion", "cta", "readability", "authenticity"] as const;

function getScoreColor(score: number) {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-amber-500";
  return "bg-red-500";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#94a3b8] capitalize">{label}</span>
        <span className={getScoreColor(value)}>{value}/10</span>
      </div>
      <div className="h-1.5 bg-[#1c1c2e] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getScoreBg(value)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CharCounter({ count, limit }: { count: number; limit: number }) {
  const remaining = limit - count;
  const pct = (count / limit) * 100;
  const color =
    remaining < 0
      ? "text-red-400"
      : remaining < 20
      ? "text-amber-400"
      : "text-[#94a3b8]";

  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 20 20" className="ring-chart">
        <circle cx="10" cy="10" r="8" fill="none" stroke="#1c1c2e" strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={remaining < 0 ? "#ef4444" : remaining < 20 ? "#f59e0b" : "#6366f1"}
          strokeWidth="2.5"
          strokeDasharray={`${Math.min(pct, 100) * 0.503} 50.3`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-xs font-mono ${color}`}>{remaining}</span>
    </div>
  );
}

function ThreadTweet({
  index,
  content,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  content: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const remaining = TWEET_LIMIT - content.length;

  return (
    <div className="relative">
      {index > 0 && (
        <div className="absolute left-4 -top-3 w-0.5 h-3 bg-[#2a2a45]" />
      )}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
            {index + 1}
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder={index === 0 ? "Start your thread here..." : `Tweet ${index + 1}...`}
              rows={3}
              className="w-full bg-transparent text-[#f1f5f9] text-sm resize-none focus:outline-none placeholder:text-[#4b5563]"
            />
            <div className="flex items-center justify-between mt-2">
              <CharCounter count={content.length} limit={TWEET_LIMIT} />
              {canRemove && (
                <button onClick={onRemove} className="text-[#4b5563] hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DraftCard({
  draft,
  index,
  score,
  isScoring,
}: {
  draft: Draft;
  index: number;
  score: Score | null;
  isScoring: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(draft.content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden fade-in">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="indigo">Draft {index + 1}</Badge>
            <span className="text-xs text-[#94a3b8] capitalize">{draft.angle}</span>
          </div>
          <div className="flex items-center gap-2">
            {score ? (
              <span className={`text-sm font-bold ${getScoreColor(score.overall)}`}>
                {score.overall.toFixed(1)}/10
              </span>
            ) : isScoring ? (
              <span className="text-xs text-[#4b5563] animate-pulse">Scoring...</span>
            ) : null}
            <button
              onClick={handleCopy}
              className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-[#22223a] flex items-center justify-center transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-[#94a3b8]" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <p className="text-[#f1f5f9] text-sm leading-relaxed whitespace-pre-wrap mb-4">{draft.content}</p>

        {/* Hook tag */}
        <div className="flex items-center gap-1.5 mb-4">
          <Zap size={12} className="text-amber-400" />
          <span className="text-xs text-[#94a3b8]">{draft.hook}</span>
        </div>

        {/* Score section */}
        {score && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#f1f5f9] transition-colors mb-2"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Score breakdown
            </button>

            {expanded && (
              <div className="space-y-2 mb-4 fade-in">
                {SCORE_METRICS.map((metric) => (
                  <ScoreBar key={metric} label={metric} value={score[metric]} />
                ))}
                {score.suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1e1e35]">
                    <p className="text-xs font-medium text-[#94a3b8] mb-1.5">Suggestions</p>
                    <ul className="space-y-1">
                      {score.suggestions.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-[#4b5563] flex gap-1.5">
                          <span className="text-indigo-500 shrink-0">-></span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function ComposePage() {
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const [mode, setMode] = useState<"single" | "thread">("single");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [scores, setScores] = useState<Record<number, Score>>({});
  const [scoringSet, setScoringSet] = useState<Set<number>>(new Set());

  // Thread mode state
  const [tweets, setTweets] = useState<string[]>(["", ""]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getLocalVoiceProfile = (): VoiceProfile | null => {
    try {
      const saved = localStorage.getItem("voice_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (!isAuthenticated) {
      toast.error("Sign in to generate AI drafts");
      return;
    }

    setLoading(true);
    setDrafts([]);
    setScores({});
    setScoringSet(new Set());

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          topic,
          count: 3,
          voiceProfile: getLocalVoiceProfile(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }

      const data = await res.json();
      setDrafts(data.drafts);
      toast.success(`Generated ${data.drafts.length} drafts!`);

      // Auto-score each draft in parallel
      data.drafts.forEach((_: Draft, i: number) => {
        setScoringSet((prev) => new Set(prev).add(i));
        scoreDraft(i, data.drafts[i].content);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const scoreDraft = async (index: number, content: string) => {
    try {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setScores((prev) => ({ ...prev, [index]: data.score }));
      }
    } catch {}
    setScoringSet((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  // Thread helpers
  const updateTweet = (i: number, val: string) => {
    setTweets((prev) => prev.map((t, idx) => (idx === i ? val : t)));
  };
  const addTweet = () => setTweets((prev) => [...prev, ""]);
  const removeTweet = (i: number) => setTweets((prev) => prev.filter((_, idx) => idx !== i));

  const copyThread = () => {
    const text = tweets.filter((t) => t.trim()).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Thread copied!");
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Compose"
        description="Generate AI drafts in your voice"
        icon={<PenLine size={18} />}
      />

      {/* Auth warning */}
      {!authLoading && !isAuthenticated && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            AI generation requires a Gemini API key.{" "}
            <a href="/settings" className="underline hover:text-amber-200">
              Add it in Settings ->
            </a>
          </p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 mb-6 p-1 bg-[#0f0f1a] rounded-xl border border-[#1e1e35] w-fit">
        {(["single", "thread"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-[#94a3b8] hover:text-[#f1f5f9]"
            }`}
          >
            {m === "single" ? "Single Post" : "Thread Builder"}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <>
          {/* Generate form */}
          <Card className="p-5 mb-6">
            <label className="block text-sm font-medium text-[#94a3b8] mb-3">
              What do you want to post about?
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="e.g. building in public, AI tools for developers, my first $1k online..."
                  rows={2}
                  className="input-base resize-none pr-4"
                />
              </div>
              <Button
                onClick={handleGenerate}
                loading={loading}
                disabled={!topic.trim() || !isAuthenticated}
                size="lg"
                className="shrink-0 self-end gap-2"
              >
                <Sparkles size={16} />
                Generate
              </Button>
            </div>
            <p className="text-xs text-[#4b5563] mt-2">Press Enter to generate / Shift+Enter for new line</p>
          </Card>

          {/* Drafts */}
          {loading && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-5">
                  <div className="space-y-3">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-16 w-full rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && drafts.length === 0 && (
            <EmptyState
              icon={<Sparkles size={24} />}
              title="Ready to generate"
              description="Enter a topic above and hit Generate to create 3 AI-drafted posts with quality scores"
            />
          )}

          {drafts.length > 0 && (
            <div className="space-y-4">
              {drafts.map((draft, i) => (
                <DraftCard
                  key={i}
                  draft={draft}
                  index={i}
                  score={scores[i] || null}
                  isScoring={scoringSet.has(i)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Thread builder */
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#94a3b8]">
              {tweets.filter((t) => t.trim()).length} tweet{tweets.filter((t) => t.trim()).length !== 1 ? "s" : ""} in thread
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={addTweet} className="gap-1.5">
                <Plus size={13} />
                Add tweet
              </Button>
              <Button variant="outline" size="sm" onClick={copyThread} className="gap-1.5">
                <Copy size={13} />
                Copy thread
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {tweets.map((tweet, i) => (
              <ThreadTweet
                key={i}
                index={i}
                content={tweet}
                onChange={(v) => updateTweet(i, v)}
                onRemove={() => removeTweet(i)}
                canRemove={tweets.length > 1}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-[#4b5563]">
            <ArrowRight size={12} />
            Tip: Use the Generate tab to create draft ideas, then paste them into your thread
          </div>
        </div>
      )}
    </div>
  );
}
