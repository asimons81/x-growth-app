"use client";

import { useState, useEffect } from "react";
import { dataApi } from "@/lib/data";
import { withUserHeaders } from "@/lib/client-user";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import { FileText, Plus, Trash2, Copy, Check, Target, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Draft {
  id: string;
  content: string;
  algorithm_score?: number;
  status: string;
  created_at: string;
}

function getScoreColor(score?: number) {
  if (!score) return "text-[#4b5563]";
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

function getScoreVariant(score?: number): Parameters<typeof Badge>[0]["variant"] {
  if (!score) return "default";
  if (score >= 8) return "success";
  if (score >= 6) return "warning";
  return "error";
}

function DraftCard({
  draft,
  onDelete,
  onScore,
  scoring,
  isAuthenticated,
}: {
  draft: Draft;
  onDelete: (id: string) => void;
  onScore: (id: string) => void;
  scoring: boolean;
  isAuthenticated: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(draft.content);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {draft.algorithm_score !== undefined ? (
            <Badge variant={getScoreVariant(draft.algorithm_score)}>
              Score: {draft.algorithm_score}/10
            </Badge>
          ) : (
            <Badge variant="default">Unscored</Badge>
          )}
          <span className="text-xs text-[#4b5563]">
            {new Date(draft.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-[#22223a] flex items-center justify-center"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[#94a3b8]" />}
          </button>
          <button
            onClick={() => onScore(draft.id)}
            disabled={scoring || !isAuthenticated}
            className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-purple-500/10 flex items-center justify-center disabled:opacity-40"
          >
            <Target size={12} className={scoring ? "text-purple-400 animate-pulse" : "text-[#94a3b8]"} />
          </button>
          <button
            onClick={() => onDelete(draft.id)}
            className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-red-500/10 flex items-center justify-center"
          >
            <Trash2 size={12} className="text-[#4b5563] hover:text-red-400" />
          </button>
        </div>
      </div>

      <p className="text-sm text-[#f1f5f9] leading-relaxed whitespace-pre-wrap line-clamp-6">
        {draft.content}
      </p>
      <p className="text-xs text-[#4b5563] mt-2">{draft.content.length} chars</p>
    </Card>
  );
}

export default function DraftsPage() {
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDraft, setNewDraft] = useState("");
  const [scoring, setScoring] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getDrafts();
      setDrafts(data);
    } catch {
      toast.error("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  const addDraft = async () => {
    if (!newDraft.trim()) return;
    setAdding(true);
    try {
      const saved = await dataApi.createDraft(newDraft.trim());
      setDrafts([saved, ...drafts]);
      setNewDraft("");
      toast.success("Draft saved!");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setAdding(false);
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      await dataApi.deleteDraft(id);
      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Draft deleted");
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  const scoreDraft = async (id: string) => {
    const draft = drafts.find((d) => d.id === id);
    if (!draft || !isAuthenticated) return;
    setScoring(id);
    try {
      const response = await fetch("/api/ai/score", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ content: draft.content }),
      });
      const data = await response.json();
      if (data.score) {
        await dataApi.updateDraft(id, draft.content, data.score.overall);
        setDrafts(
          drafts.map((d) =>
            d.id === id ? { ...d, algorithm_score: data.score.overall, status: "scored" } : d
          )
        );
        toast.success(`Score: ${data.score.overall}/10`);
      }
    } catch {
      toast.error("Scoring failed");
    } finally {
      setScoring(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/library" className="flex items-center gap-1.5 text-xs text-[#4b5563] hover:text-[#94a3b8] transition-colors">
          <ArrowLeft size={12} />
          Library
        </Link>
      </div>

      <PageHeader
        title="Saved Drafts"
        description="Your draft post collection"
        icon={<FileText size={18} />}
        action={<Badge variant="default">{drafts.length} drafts</Badge>}
      />

      {!authLoading && !isAuthenticated && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <span className="text-amber-400 text-sm">
            Sign in to score drafts with AI.{" "}
            <a href="/settings" className="underline hover:text-amber-200">Settings -></a>
          </span>
        </div>
      )}

      {/* Add draft */}
      <Card className="p-5 mb-6">
        <label className="block text-sm font-medium text-[#94a3b8] mb-3">Save a draft</label>
        <textarea
          value={newDraft}
          onChange={(e) => setNewDraft(e.target.value)}
          placeholder="Paste or write a post draft to save here..."
          rows={3}
          className="input-base resize-none mb-3"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#4b5563]">
            Tip: Generate drafts in{" "}
            <a href="/compose" className="text-indigo-400 hover:text-indigo-300">Compose</a>
          </p>
          <Button onClick={addDraft} loading={adding} disabled={!newDraft.trim()} className="gap-2">
            <Plus size={13} />
            Save draft
          </Button>
        </div>
      </Card>

      {/* Drafts grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5">
              <div className="skeleton h-5 w-24 rounded-full mb-3" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-4 w-3/5 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="No drafts saved"
          description="Save drafts from the Compose page or manually above"
          action={
            <Link href="/compose">
              <Button className="gap-2">
                <Plus size={13} />
                Generate drafts
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onDelete={deleteDraft}
              onScore={scoreDraft}
              scoring={scoring === draft.id}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
