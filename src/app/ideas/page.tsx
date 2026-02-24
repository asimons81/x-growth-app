"use client";

import { useState, useEffect } from "react";
import { dataApi } from "@/lib/data";
import { withUserHeaders } from "@/lib/client-user";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import {
  Lightbulb,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  X,
} from "lucide-react";

interface Idea {
  id: string;
  content: string;
  topics: string[];
  created_at: string;
}

const TOPICS = ["AI", "Tech", "Coding", "Growth", "Photography", "UFC", "Personal", "News", "Other"];

const TOPIC_COLORS: Record<string, string> = {
  AI: "indigo",
  Tech: "cyan",
  Coding: "purple",
  Growth: "success",
  Photography: "warning",
  UFC: "error",
  Personal: "default",
  News: "indigo",
  Other: "default",
};

function IdeaCard({
  idea,
  onDelete,
  onExpand,
  expandingId,
}: {
  idea: Idea;
  onDelete: (id: string) => void;
  onExpand: (idea: Idea) => void;
  expandingId: string | null;
}) {
  const isExpanding = expandingId === idea.id;
  const timeAgo = (() => {
    const diff = Date.now() - new Date(idea.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <Card className="p-4 group hover:border-[#2a2a45] fade-in">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb size={15} className="text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[#f1f5f9] text-sm leading-relaxed mb-2">{idea.content}</p>

          <div className="flex flex-wrap gap-1 mb-3">
            {idea.topics?.map((topic) => (
              <Badge
                key={topic}
                variant={(TOPIC_COLORS[topic] || "default") as Parameters<typeof Badge>[0]["variant"]}
              >
                {topic}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#4b5563]">{timeAgo}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExpand(idea)}
                loading={isExpanding}
                className="gap-1.5 text-indigo-400 hover:text-indigo-300"
              >
                <Sparkles size={12} />
                Expand with AI
              </Button>
              <button
                onClick={() => onDelete(idea.id)}
                className="p-1.5 text-[#4b5563] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ExpandedModal({
  idea,
  expanded,
  onClose,
  onUse,
}: {
  idea: Idea | null;
  expanded: string;
  onClose: () => void;
  onUse: (text: string) => void;
}) {
  if (!idea) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card
        className="max-w-lg w-full p-6 fade-in"
        elevated
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <span className="font-semibold text-[#f1f5f9]">AI-Expanded Idea</span>
          </div>
          <button onClick={onClose} className="text-[#4b5563] hover:text-[#94a3b8] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="mb-2">
          <p className="text-xs text-[#4b5563] uppercase tracking-wider mb-1">Original</p>
          <p className="text-sm text-[#94a3b8] italic">{idea.content}</p>
        </div>

        <div className="h-px bg-[#1e1e35] my-4" />

        <div className="mb-6">
          <p className="text-xs text-[#4b5563] uppercase tracking-wider mb-1">Expanded</p>
          <p className="text-[#f1f5f9] text-sm leading-relaxed whitespace-pre-wrap">{expanded}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            fullWidth
            onClick={() => onUse(expanded)}
            className="gap-2"
          >
            <ArrowRight size={14} />
            Use in Compose
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIdea, setNewIdea] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("Other");
  const [filterTopic, setFilterTopic] = useState("All");
  const [search, setSearch] = useState("");
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [expandedModal, setExpandedModal] = useState<{
    idea: Idea;
    text: string;
  } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getIdeas();
      setIdeas(data);
    } catch {
      toast.error("Failed to load ideas");
    } finally {
      setLoading(false);
    }
  };

  const addIdea = async () => {
    if (!newIdea.trim()) return;
    setAdding(true);
    try {
      const saved = await dataApi.createIdea(newIdea.trim(), [selectedTopic]);
      setIdeas([saved, ...ideas]);
      setNewIdea("");
      toast.success("Idea captured!");
    } catch {
      toast.error("Failed to save idea");
    } finally {
      setAdding(false);
    }
  };

  const deleteIdea = async (id: string) => {
    try {
      await dataApi.deleteIdea(id);
      setIdeas(ideas.filter((i) => i.id !== id));
      toast.success("Idea deleted");
    } catch {
      toast.error("Failed to delete idea");
    }
  };

  const expandIdea = async (idea: Idea) => {
    setExpandingId(idea.id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          topic: `Expand this idea into a detailed post concept: ${idea.content}`,
          count: 1,
        }),
      });
      if (!res.ok) throw new Error("Failed to expand");
      const data = await res.json();
      const expanded = data.drafts?.[0]?.content || "Could not expand idea.";
      setExpandedModal({ idea, text: expanded });
    } catch {
      toast.error("Could not expand idea — check your API key");
    } finally {
      setExpandingId(null);
    }
  };

  const handleUseExpanded = (text: string) => {
    // Navigate to compose with the text pre-filled via query param
    const url = `/compose?topic=${encodeURIComponent(text.substring(0, 100))}`;
    window.location.href = url;
  };

  const filteredIdeas = ideas
    .filter((i) => filterTopic === "All" || i.topics?.includes(filterTopic))
    .filter(
      (i) =>
        !search || i.content.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <PageHeader
        title="Ideas"
        description="Brain dump and expand your content ideas"
        icon={<Lightbulb size={18} />}
        action={
          <Badge variant="default">{ideas.length} ideas</Badge>
        }
      />

      {/* Quick capture */}
      <Card className="p-5 mb-6">
        <p className="text-sm font-medium text-[#94a3b8] mb-3">Capture an idea</p>
        <textarea
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) addIdea();
          }}
          placeholder="What's on your mind? Drop a raw idea, observation, or topic..."
          rows={2}
          className="input-base resize-none mb-3"
        />

        <div className="flex flex-wrap gap-1.5 mb-3">
          {TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTopic === topic
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45] hover:border-[#4b5563]"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-[#4b5563]">⌘+Enter to save</p>
          <Button
            onClick={addIdea}
            loading={adding}
            disabled={!newIdea.trim()}
            size="sm"
            className="gap-2"
          >
            <Plus size={13} />
            Add Idea
          </Button>
        </div>
      </Card>

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
          <input
            type="text"
            placeholder="Search ideas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-8 py-2"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[#4b5563]" />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterTopic("All")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterTopic === "All"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45] hover:border-[#4b5563]"
              }`}
            >
              All ({ideas.length})
            </button>
            {TOPICS.filter((t) => ideas.some((i) => i.topics?.includes(t))).map((topic) => {
              const count = ideas.filter((i) => i.topics?.includes(topic)).length;
              return (
                <button
                  key={topic}
                  onClick={() => setFilterTopic(topic)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterTopic === topic
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45] hover:border-[#4b5563]"
                  }`}
                >
                  {topic} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ideas list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredIdeas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={24} />}
          title={ideas.length === 0 ? "No ideas yet" : "No matches"}
          description={
            ideas.length === 0
              ? "Start brain-dumping above. Every great post starts with a raw idea."
              : "Try a different search or filter"
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onDelete={deleteIdea}
              onExpand={expandIdea}
              expandingId={expandingId}
            />
          ))}
        </div>
      )}

      {/* Expanded idea modal */}
      {expandedModal && (
        <ExpandedModal
          idea={expandedModal.idea}
          expanded={expandedModal.text}
          onClose={() => setExpandedModal(null)}
          onUse={handleUseExpanded}
        />
      )}
    </div>
  );
}
