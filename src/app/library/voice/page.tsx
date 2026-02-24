"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { withUserHeaders } from "@/lib/client-user";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import toast from "react-hot-toast";
import { Mic, Upload, Sparkles, AlertCircle, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface VoiceProfile {
  commonWords: string[];
  sentenceStarts: string[];
  toneKeywords: string[];
  ctaPatterns: string[];
  formalityScore: number;
  avgPostLength: number;
}

function ProfileDNA({ profile }: { profile: VoiceProfile }) {
  const formality = profile.formalityScore;
  const formalityLabel =
    formality <= 3 ? "Casual & conversational" : formality <= 6 ? "Balanced" : "Professional & formal";

  return (
    <div className="space-y-4">
      {/* Formality */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Formality Score</p>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-2 bg-[#1c1c2e] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${formality * 10}%` }}
            />
          </div>
          <span className="text-lg font-bold text-[#f1f5f9]">{formality}/10</span>
        </div>
        <p className="text-xs text-[#4b5563]">{formalityLabel}</p>
      </Card>

      {/* Avg post length */}
      <Card className="p-4">
        <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Avg Post Length</p>
        <p className="text-3xl font-bold text-indigo-400">{profile.avgPostLength}</p>
        <p className="text-xs text-[#4b5563]">words per post</p>
      </Card>

      {/* Common words */}
      {profile.commonWords.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Common Words</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.commonWords.slice(0, 12).map((word, i) => (
              <Badge key={i} variant="default">{word}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Tone keywords */}
      {profile.toneKeywords.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Tone Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.toneKeywords.slice(0, 10).map((word, i) => (
              <Badge key={i} variant="purple">{word}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* CTA patterns */}
      {profile.ctaPatterns.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">CTA Patterns</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.ctaPatterns.slice(0, 6).map((pattern, i) => (
              <Badge key={i} variant="success">{pattern}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Sentence starts */}
      {profile.sentenceStarts.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">How you start sentences</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.sentenceStarts.slice(0, 8).map((s, i) => (
              <Badge key={i} variant="indigo">{s}</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function VoiceProfilePage() {
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const [posts, setPosts] = useState("");
  const [postsArray, setPostsArray] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("voice_profile");
      if (saved) setProfile(JSON.parse(saved) as VoiceProfile);
    } catch {}
  }, []);

  const handleExtract = async () => {
    if (!posts.trim()) return;
    if (!isAuthenticated) {
      toast.error("Sign in to extract your voice profile");
      return;
    }

    const postList = posts.split("\n").filter((p) => p.trim()).slice(0, 50);
    if (postList.length < 5) {
      toast.error("Add at least 5 posts for voice extraction");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/voice-extract", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ posts: postList }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to extract voice");
      }

      const data = await res.json();
      setProfile(data.profile);
      localStorage.setItem("voice_profile", JSON.stringify(data.profile));
      toast.success("Voice profile extracted! AI will now write in your style.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extract voice");
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data as Record<string, string>[];
      const headers = Object.keys(rows[0] || {});

      const contentKeywords = ["text", "content", "body", "full_text", "description"];
      const contentColumn = headers.find((h) => {
        const lower = h.toLowerCase().replace(/['"]/g, "").trim();
        return contentKeywords.some((k) => lower.includes(k));
      });

      if (!contentColumn) {
        toast.error(`No content column found. Headers: ${headers.join(", ")}`);
        return;
      }

      const impressionsCol = headers.find((h) => h.toLowerCase().includes("impression"));
      const likesCol = headers.find((h) => h.toLowerCase().includes("like") && !h.toLowerCase().includes("unlike"));
      const engagementsCol = headers.find((h) => h.toLowerCase().includes("engagement"));

      let finalPosts: string[];

      if (impressionsCol || likesCol || engagementsCol) {
        const scored = rows.map((row) => {
          let score = 0;
          if (impressionsCol) score += parseInt(String(row[impressionsCol] || "0")) || 0;
          if (likesCol) score += (parseInt(String(row[likesCol] || "0")) || 0) * 2;
          if (engagementsCol) score += parseInt(String(row[engagementsCol] || "0")) || 0;
          return { row, score };
        });
        scored.sort((a, b) => b.score - a.score);
        finalPosts = scored.slice(0, 50)
          .map((s) => s.row[contentColumn]?.trim())
          .filter((p): p is string => !!p && p.length > 10);
      } else {
        finalPosts = rows.slice(0, 50)
          .map((row) => row[contentColumn]?.trim())
          .filter((p): p is string => !!p && p.length > 10);
      }

      if (finalPosts.length < 5) {
        toast.error(`Only ${finalPosts.length} valid posts found. Need at least 5.`);
        return;
      }

      setPosts(finalPosts.join("\n"));
      setPostsArray(finalPosts);
      toast.success(`${finalPosts.length} posts loaded and ready for analysis!`);
    } catch {
      toast.error("Failed to parse CSV");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearProfile = () => {
    localStorage.removeItem("voice_profile");
    setProfile(null);
    setPosts("");
    setPostsArray([]);
    toast.success("Voice profile cleared");
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-2">
        <Link href="/library" className="flex items-center gap-1.5 text-xs text-[#4b5563] hover:text-[#94a3b8] transition-colors">
          <ArrowLeft size={12} />
          Library
        </Link>
      </div>

      <PageHeader
        title="Voice Profile"
        description="Train AI to write exactly like you"
        icon={<Mic size={18} />}
        action={
          profile && (
            <Button variant="danger" size="sm" onClick={clearProfile} className="gap-2">
              <RefreshCw size={12} />
              Reset profile
            </Button>
          )
        }
      />

      {!authLoading && !isAuthenticated && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            Add your Gemini API key in{" "}
            <a href="/settings" className="underline hover:text-amber-200">Settings</a>{" "}
            to extract your voice profile.
          </p>
        </div>
      )}

      {profile && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            Voice profile active -- AI will now generate posts in your writing style.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <h2 className="font-semibold text-[#f1f5f9] mb-4 text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-400 font-bold">1</span>
            Import your posts
          </h2>

          {/* CSV upload */}
          <Card className="p-5 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVImport}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <div className="border-2 border-dashed border-[#2a2a45] hover:border-indigo-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-indigo-500/5">
                <Upload size={18} className="text-[#4b5563] mx-auto mb-2" />
                <p className="text-sm text-[#94a3b8]">
                  {importing ? "Processing CSV..." : "Upload your X posts CSV"}
                </p>
                <p className="text-xs text-[#4b5563] mt-1">
                  Needs a &quot;content&quot; or &quot;text&quot; column
                </p>
              </div>
            </label>
          </Card>

          {/* Posts preview / manual input */}
          {postsArray.length > 0 ? (
            <div>
              <p className="text-xs text-[#94a3b8] mb-2 font-medium">
                Preview -- top {postsArray.length} posts by engagement
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto scroll-x mb-4 pr-1">
                {postsArray.map((post, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
                    <span className="text-xs text-[#4b5563] mr-2">{i + 1}.</span>
                    <span className="text-xs text-[#94a3b8]">
                      {post.length > 120 ? post.substring(0, 120) + "..." : post}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-xs text-[#94a3b8] mb-2 font-medium">Or paste posts manually (one per line, min. 5)</p>
              <textarea
                value={posts}
                onChange={(e) => setPosts(e.target.value)}
                placeholder={"Paste your X posts here, one per line...\n\nEach post should be a separate line."}
                rows={8}
                className="input-base resize-none"
              />
            </div>
          )}

          <Button
            onClick={handleExtract}
            loading={loading}
            disabled={!posts.trim() || !isAuthenticated}
            fullWidth
            className="gap-2"
          >
            <Sparkles size={15} />
            {loading ? "Analyzing your writing..." : "Extract my voice"}
          </Button>
        </div>

        {/* Profile display */}
        <div>
          <h2 className="font-semibold text-[#f1f5f9] mb-4 text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs text-indigo-400 font-bold">2</span>
            Your voice DNA
          </h2>

          {profile ? (
            <ProfileDNA profile={profile} />
          ) : (
            <Card className="p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Mic size={20} className="text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-[#94a3b8] mb-1">No voice profile yet</p>
              <p className="text-xs text-[#4b5563]">
                Import your posts on the left and click Extract to build your writing DNA
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
