"use client";

import { useState, useEffect } from "react";
import { dataApi } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import { Zap, Plus, Trash2, Copy, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Hook {
  id: string;
  hook_text: string;
  hook_type: string;
  created_at: string;
}

const HOOK_TYPES = [
  { value: "question", label: "Question", color: "indigo" },
  { value: "statement", label: "Statement", color: "purple" },
  { value: "claim", label: "Hot Take", color: "warning" },
  { value: "callout", label: "Callout", color: "error" },
  { value: "stat", label: "Statistic", color: "cyan" },
  { value: "story", label: "Story", color: "success" },
  { value: "contrarian", label: "Contrarian", color: "warning" },
  { value: "list", label: "List", color: "indigo" },
  { value: "secret", label: "Secret", color: "purple" },
  { value: "bold", label: "Bold Claim", color: "error" },
];

function HookCard({ hook, onDelete }: { hook: Hook; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const typeInfo = HOOK_TYPES.find((t) => t.value === hook.hook_type) || { label: hook.hook_type, color: "default" };

  const getBadgeVariant = (color: string): Parameters<typeof Badge>[0]["variant"] => {
    const map: Record<string, Parameters<typeof Badge>[0]["variant"]> = {
      indigo: "indigo", purple: "purple", cyan: "cyan",
      warning: "warning", success: "success", error: "error",
    };
    return map[color] || "default";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(hook.hook_text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-4 group hover:border-[#2a2a45]">
      <div className="flex items-start justify-between mb-2">
        <Badge variant={getBadgeVariant(typeInfo.color)}>{typeInfo.label}</Badge>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-[#22223a] flex items-center justify-center"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-[#94a3b8]" />}
          </button>
          <button
            onClick={() => onDelete(hook.id)}
            className="w-7 h-7 rounded-lg bg-[#1c1c2e] hover:bg-red-500/10 flex items-center justify-center"
          >
            <Trash2 size={12} className="text-[#4b5563] hover:text-red-400" />
          </button>
        </div>
      </div>
      <p className="text-sm text-[#f1f5f9] leading-relaxed">{hook.hook_text}</p>
    </Card>
  );
}

export default function HooksPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHook, setNewHook] = useState("");
  const [hookType, setHookType] = useState("statement");
  const [adding, setAdding] = useState(false);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadHooks();
  }, []);

  const loadHooks = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getHooks();
      setHooks(data);
    } catch {
      toast.error("Failed to load hooks");
    } finally {
      setLoading(false);
    }
  };

  const addHook = async () => {
    if (!newHook.trim()) return;
    setAdding(true);
    try {
      const saved = await dataApi.createHook(newHook.trim(), hookType);
      setHooks([saved, ...hooks]);
      setNewHook("");
      toast.success("Hook saved!");
    } catch {
      toast.error("Failed to save hook");
    } finally {
      setAdding(false);
    }
  };

  const deleteHook = async (id: string) => {
    try {
      await dataApi.deleteHook(id);
      setHooks(hooks.filter((h) => h.id !== id));
      toast.success("Hook deleted");
    } catch {
      toast.error("Failed to delete hook");
    }
  };

  const filteredHooks = filterType === "all" ? hooks : hooks.filter((h) => h.hook_type === filterType);

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/library" className="flex items-center gap-1.5 text-xs text-[#4b5563] hover:text-[#94a3b8] transition-colors">
          <ArrowLeft size={12} />
          Library
        </Link>
      </div>

      <PageHeader
        title="Hooks"
        description="Your collection of high-performing opening lines"
        icon={<Zap size={18} />}
        action={
          <Link href="/hooks">
            <Button variant="secondary" size="sm" className="gap-2">
              <Zap size={12} />
              Generate hooks
            </Button>
          </Link>
        }
      />

      {/* Add hook */}
      <Card className="p-5 mb-6">
        <label className="block text-sm font-medium text-[#94a3b8] mb-3">Add a hook manually</label>
        <textarea
          value={newHook}
          onChange={(e) => setNewHook(e.target.value)}
          placeholder="Write your hook line here..."
          rows={2}
          className="input-base resize-none mb-3"
        />

        <div className="flex flex-wrap gap-1.5 mb-3">
          {HOOK_TYPES.slice(0, 6).map((type) => (
            <button
              key={type.value}
              onClick={() => setHookType(type.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                hookType === type.value
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45] hover:border-[#4b5563]"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <Button onClick={addHook} loading={adding} disabled={!newHook.trim()} className="gap-2">
          <Plus size={13} />
          Save hook
        </Button>
      </Card>

      {/* Filter */}
      {hooks.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-5">
          <button
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45]"
            }`}
          >
            All ({hooks.length})
          </button>
          {HOOK_TYPES.filter((t) => hooks.some((h) => h.hook_type === t.value)).map((type) => (
            <button
              key={type.value}
              onClick={() => setFilterType(type.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === type.value
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-[#1c1c2e] text-[#94a3b8] border border-[#2a2a45]"
              }`}
            >
              {type.label} ({hooks.filter((h) => h.hook_type === type.value).length})
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="skeleton h-5 w-20 rounded-full mb-3" />
              <div className="skeleton h-12 w-full rounded" />
            </Card>
          ))}
        </div>
      ) : filteredHooks.length === 0 ? (
        <EmptyState
          icon={<Zap size={24} />}
          title="No hooks saved yet"
          description="Save hooks manually above or use the Hook Generator to create them with AI"
          action={
            <Link href="/hooks">
              <Button className="gap-2">
                <Zap size={13} />
                Generate hooks with AI
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filteredHooks.map((hook) => (
            <HookCard key={hook.id} hook={hook} onDelete={deleteHook} />
          ))}
        </div>
      )}
    </div>
  );
}
