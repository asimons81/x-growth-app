"use client";

import { useState, useEffect } from "react";
import { withUserHeaders } from "@/lib/client-user";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import toast from "react-hot-toast";
import {
  Settings,
  User,
  Key,
  Upload,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
} from "lucide-react";

interface ApiKey {
  id: string;
  provider: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
  requestId?: string;
}

interface AuthHealthResult {
  ok: boolean;
  checks: {
    envConfigured: boolean;
    supabaseUrlReachable: boolean;
    emailProviderLikelyEnabled?: boolean;
  };
  status?: number;
  error?: string;
  code?: string;
  requestId?: string;
}

const PROVIDERS = [
  {
    id: "google",
    name: "Google Gemini",
    placeholder: "AIza...",
    description: "Powers all AI features",
    required: true,
    comingSoon: false,
  },
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    description: "Fallback AI model (optional)",
    required: false,
    comingSoon: false,
  },
  {
    id: "x_api",
    name: "X (Twitter) API",
    placeholder: "Bearer token",
    description: "Auto-posting & analytics (coming soon)",
    required: false,
    comingSoon: true,
  },
];

function ApiKeyCard({
  provider,
  savedKey,
  value,
  onChange,
  onSave,
  onDelete,
  loading,
  isAuthenticated,
}: {
  provider: (typeof PROVIDERS)[0];
  savedKey?: ApiKey;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Sparkles size={16} className="text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-[#f1f5f9] text-sm">{provider.name}</p>
            <p className="text-xs text-[#94a3b8]">{provider.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {provider.required && <Badge variant="indigo">Required</Badge>}
          {provider.comingSoon && <Badge variant="default">Soon</Badge>}
          {savedKey && <Badge variant="success">Connected</Badge>}
        </div>
      </div>

      {savedKey ? (
        <div className="flex items-center justify-between p-3 bg-[#1c1c2e] rounded-xl border border-[#2a2a45]">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-sm text-[#94a3b8] font-mono">****************</span>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            disabled={!isAuthenticated}
            className="gap-1.5"
          >
            <Trash2 size={12} />
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? "text" : "password"}
              placeholder={provider.comingSoon ? "Coming soon" : provider.placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={provider.comingSoon || !isAuthenticated}
              className="input-base pr-10 font-mono text-sm disabled:opacity-40"
            />
            {!provider.comingSoon && (
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-[#94a3b8] transition-colors"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
          <Button
            onClick={onSave}
            loading={loading}
            disabled={provider.comingSoon || !value.trim() || !isAuthenticated}
            size="md"
          >
            Save
          </Button>
        </div>
      )}

      {!isAuthenticated && !savedKey && (
        <p className="text-xs text-amber-400 mt-2">Sign in above to save API keys</p>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const [authLoading, setAuthLoading] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authHealthLoading, setAuthHealthLoading] = useState(false);
  const [authHealth, setAuthHealth] = useState<AuthHealthResult | null>(null);
  const isAuthenticated = !!currentUserEmail;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthRequired(params.get("auth") === "required");
  }, []);

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        setCurrentUserEmail(userData.user?.email ?? null);
        if (!userData.user) { setKeys([]); return; }
        const res = await fetch("/api/settings/keys", { headers: withUserHeaders() });
        const data = await res.json();
        if (res.ok) setKeys(data);
      } catch {}
    };
    loadKeys();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserEmail(session?.user?.email ?? null);
      if (session?.user) {
        fetch("/api/settings/keys", { headers: withUserHeaders() })
          .then(async (res) => { const data = await res.json(); if (res.ok) setKeys(data); })
          .catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    try {
      const redirectUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail.trim(),
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast.success("Magic link sent! Check your email.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to send link";
      const isNetworkFailure = text.includes("Failed to fetch") || text.includes("NetworkError");
      toast.error(
        isNetworkFailure
          ? "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and run Auth Diagnostics."
          : text
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUserEmail(null);
      setKeys([]);
      toast.success("Signed out");
    } catch {
      toast.error("Sign out failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRunAuthDiagnostics = async () => {
    setAuthHealthLoading(true);
    setAuthHealth(null);
    try {
      const res = await fetch("/api/auth/health", { cache: "no-store" });
      const data = await res.json() as AuthHealthResult;
      setAuthHealth(data);
      if (data.ok) toast.success("Auth diagnostics passed");
      else toast.error(data.error || "Auth diagnostics failed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Diagnostics failed");
    } finally {
      setAuthHealthLoading(false);
    }
  };

  const handleSaveKey = async (provider: string) => {
    if (!isAuthenticated) { toast.error("Sign in first"); return; }
    const key = newKeys[provider];
    if (!key) return;
    setLoading(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: withUserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ provider, key, label: `${provider} key` }),
      });
      const savedKey = await res.json();
      if (!res.ok) {
        const payload = (savedKey ?? {}) as ApiErrorPayload;
        throw new Error(`${payload.error || "Failed to save"}${payload.code ? ` (${payload.code})` : ""}`);
      }
      setKeys([...keys.filter((k) => k.provider !== provider), savedKey]);
      setNewKeys({ ...newKeys, [provider]: "" });
      toast.success("API key saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!isAuthenticated) { toast.error("Sign in first"); return; }
    const target = keys.find((k) => k.provider === provider);
    if (!target) return;
    try {
      const res = await fetch(`/api/settings/keys?id=${target.id}`, {
        method: "DELETE",
        headers: withUserHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        const payload = (data ?? {}) as ApiErrorPayload;
        throw new Error(payload.error || "Delete failed");
      }
      setKeys(keys.filter((k) => k.provider !== provider));
      toast.success("API key removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove key");
    }
  };

  const handleImportPosts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) { toast.error("Sign in first"); e.target.value = ""; return; }
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "posts");
      const res = await fetch("/api/import", { method: "POST", headers: withUserHeaders(), body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      toast.success(`Imported ${data.imported} posts, skipped ${data.skipped}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        description="Configure your account and integrations"
        icon={<Settings size={18} />}
      />

      {/* Auth */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <User size={15} className="text-[#4b5563]" />
          <h2 className="font-semibold text-[#f1f5f9]">Authentication</h2>
        </div>

        {authRequired && (
          <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">Sign in to access protected features.</p>
          </div>
        )}

        <Card className="p-5">
          {isAuthenticated ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <User size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-[#4b5563]">Signed in as</p>
                  <p className="font-medium text-[#f1f5f9] text-sm">{currentUserEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Connected</Badge>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleSignOut}
                  loading={authLoading}
                >
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#94a3b8] mb-4">
                Sign in with your email -- we&apos;ll send a magic link. No password needed.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  placeholder="you@example.com"
                  className="input-base flex-1"
                />
                <Button
                  onClick={handleSignIn}
                  loading={authLoading}
                  disabled={!authEmail.trim()}
                >
                  Send link
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRunAuthDiagnostics}
                loading={authHealthLoading}
                className="gap-2"
              >
                <Activity size={13} />
                Run auth diagnostics
              </Button>

              {authHealth && (
                <div className="mt-3 p-4 rounded-xl bg-[#1c1c2e] border border-[#2a2a45] space-y-2 text-xs">
                  {[
                    { label: "Env configured", value: authHealth.checks.envConfigured },
                    { label: "Supabase reachable", value: authHealth.checks.supabaseUrlReachable },
                    { label: "Email provider enabled", value: authHealth.checks.emailProviderLikelyEnabled },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      {value ? (
                        <CheckCircle size={12} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={12} className="text-red-400" />
                      )}
                      <span className="text-[#94a3b8]">{label}:</span>
                      <span className={value ? "text-emerald-400" : "text-red-400"}>
                        {value ? "Yes" : "No"}
                      </span>
                    </div>
                  ))}
                  {authHealth.error && <p className="text-red-400 pt-1">{authHealth.error}</p>}
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* API Keys */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={15} className="text-[#4b5563]" />
            <h2 className="font-semibold text-[#f1f5f9]">API Keys</h2>
          </div>
          <p className="text-xs text-[#4b5563]">Encrypted &amp; stored securely</p>
        </div>

        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ApiKeyCard
              key={provider.id}
              provider={provider}
              savedKey={keys.find((k) => k.provider === provider.id)}
              value={newKeys[provider.id] || ""}
              onChange={(v) => setNewKeys({ ...newKeys, [provider.id]: v })}
              onSave={() => handleSaveKey(provider.id)}
              onDelete={() => handleDeleteKey(provider.id)}
              loading={loading}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      </section>

      {/* Import */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Upload size={15} className="text-[#4b5563]" />
          <h2 className="font-semibold text-[#f1f5f9]">Import Data</h2>
        </div>

        <Card className="p-5">
          <p className="text-sm text-[#94a3b8] mb-4">
            Import your X post history from a CSV export to populate Analytics and Voice Profile.
          </p>

          <input
            type="file"
            accept=".csv"
            id="posts-import"
            className="hidden"
            onChange={handleImportPosts}
            disabled={importing || !isAuthenticated}
          />
          <label htmlFor="posts-import">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isAuthenticated
                  ? "border-[#2a2a45] hover:border-indigo-500/40 hover:bg-indigo-500/5"
                  : "border-[#1e1e35] opacity-40"
              }`}
            >
              <Upload size={20} className="text-[#4b5563] mx-auto mb-2" />
              <p className="text-sm text-[#94a3b8]">
                {!isAuthenticated
                  ? "Sign in to import data"
                  : importing
                  ? "Importing..."
                  : "Click to upload posts CSV"}
              </p>
              <p className="text-xs text-[#4b5563] mt-1">Supports X Analytics CSV format</p>
            </div>
          </label>

          <p className="text-xs text-[#4b5563] mt-3">
            Expected columns: content, posted_at, impressions, likes, replies, retweets
          </p>
        </Card>
      </section>
    </div>
  );
}
