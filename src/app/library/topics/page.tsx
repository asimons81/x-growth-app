"use client";

import { useState, useEffect } from "react";
import { dataApi } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import { Tag, Plus, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Topic {
  id: string;
  topic: string;
  color?: string;
  created_at: string;
}

const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#84cc16",
  "#f97316", "#a78bfa",
];

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState("");
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getTopics();
      setTopics(data);
    } catch {
      toast.error("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    setAdding(true);
    try {
      const saved = await dataApi.createTopic(newTopic.trim(), selectedColor);
      setTopics([...topics, saved]);
      setNewTopic("");
      toast.success("Topic added!");
    } catch {
      toast.error("Failed to add topic");
    } finally {
      setAdding(false);
    }
  };

  const deleteTopic = async (id: string) => {
    try {
      await dataApi.deleteTopic(id);
      setTopics(topics.filter((t) => t.id !== id));
      toast.success("Topic removed");
    } catch {
      toast.error("Failed to delete topic");
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
        title="Topics"
        description="The content categories you post about"
        icon={<Tag size={18} />}
      />

      {/* Add topic */}
      <Card className="p-5 mb-6">
        <label className="block text-sm font-medium text-[#94a3b8] mb-3">Add a topic</label>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            placeholder="e.g. AI, Building in Public, Productivity..."
            className="input-base flex-1"
          />
          <Button onClick={addTopic} loading={adding} disabled={!newTopic.trim()} className="gap-2 shrink-0">
            <Plus size={13} />
            Add
          </Button>
        </div>

        {/* Color picker */}
        <div>
          <p className="text-xs text-[#4b5563] mb-2">Tag color</p>
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-7 h-7 rounded-full transition-transform ${selectedColor === color ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-[#0f0f1a]" : "hover:scale-110"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Topics grid */}
      {loading ? (
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-9 w-24 rounded-full" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <EmptyState
          icon={<Tag size={24} />}
          title="No topics yet"
          description="Add your content categories to organize ideas and tag posts"
        />
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {topics.map((topic) => {
            const color = topic.color || PALETTE[0];
            return (
              <div
                key={topic.id}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium group"
                style={{
                  backgroundColor: `${color}18`,
                  border: `1px solid ${color}40`,
                  color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                {topic.topic}
                <button
                  onClick={() => deleteTopic(topic.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white ml-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
