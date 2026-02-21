"use client";

import { useState, useEffect } from 'react';
import { withUserHeaders } from '@/lib/client-user';
import { supabase } from '@/lib/supabase';

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
  { id: 'google', name: 'Google Gemini', placeholder: 'AI_xxxxxxxx', description: 'For AI generation' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-xxxxx', description: 'Fallback AI model' },
  { id: 'x_api', name: 'X (Twitter) API', placeholder: 'Bearer token', description: 'For posting + analytics (future)' },
];

export default function SettingsPage() {
  const [authLoading, setAuthLoading] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authHealthLoading, setAuthHealthLoading] = useState(false);
  const [authHealth, setAuthHealth] = useState<AuthHealthResult | null>(null);
  const isAuthenticated = !!currentUserEmail;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthRequired(params.get('auth') === 'required');
  }, []);

  // Load persisted encrypted keys metadata from server
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        setCurrentUserEmail(userData.user?.email ?? null);

        if (!userData.user) {
          setKeys([]);
          return;
        }

        const res = await fetch('/api/settings/keys', {
          headers: withUserHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load keys');
        setKeys(data);
      } catch {
        setMessage({ type: 'error', text: 'Failed to load API keys' });
      }
    };

    loadKeys();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserEmail(session?.user?.email ?? null);
      if (session?.user) {
        fetch('/api/settings/keys', { headers: withUserHeaders() })
          .then(async (res) => {
            const data = await res.json();
            if (res.ok) {
              setKeys(data);
            }
          })
          .catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!authEmail.trim()) return;
    setAuthLoading(true);
    setMessage(null);

    try {
      setAuthHealth(null);
      const redirectUrl =
        process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      setMessage({
        type: 'success',
        text: 'Magic link sent. Open your email to finish sign-in.',
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to send sign-in link';
      const isNetworkFailure =
        text.includes('Failed to fetch') ||
        text.includes('NetworkError') ||
        text.includes('Load failed');

      setMessage({
        type: 'error',
        text: isNetworkFailure
          ? 'Cannot reach Supabase Auth endpoint. Verify NEXT_PUBLIC_SUPABASE_URL, DNS, and network access. Then run Auth Diagnostics below.'
          : text,
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRunAuthDiagnostics = async () => {
    setAuthHealthLoading(true);
    setAuthHealth(null);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/health', { cache: 'no-store' });
      const data = (await res.json()) as AuthHealthResult;
      setAuthHealth(data);

      if (data.ok) {
        setMessage({ type: 'success', text: 'Auth diagnostics passed.' });
      } else {
        setMessage({
          type: 'error',
          text:
            data.error ||
            'Auth diagnostics failed. Verify Supabase URL/key and provider settings.',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to run diagnostics',
      });
    } finally {
      setAuthHealthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUserEmail(null);
      setKeys([]);
      setMessage({ type: 'success', text: 'Signed out.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to sign out',
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveKey = async (provider: string) => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Sign in first to save API keys.' });
      return;
    }

    const key = newKeys[provider];
    if (!key) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: withUserHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ provider, key, label: `${provider} key` }),
      });
      const savedKey = await res.json();
      if (!res.ok) {
        const payload = (savedKey ?? {}) as ApiErrorPayload;
        const safeError = payload.error || 'Failed to save API key';
        const suffix = payload.code ? ` (code: ${payload.code})` : '';
        const ref = payload.requestId ? ` Ref: ${payload.requestId}` : '';
        throw new Error(`${safeError}${suffix}${ref}`);
      }

      setKeys([...keys.filter(k => k.provider !== provider), savedKey]);
      
      setMessage({ type: 'success', text: 'API key saved!' });
      setNewKeys({ ...newKeys, [provider]: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save API key' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Sign in first to delete API keys.' });
      return;
    }

    const target = keys.find((k) => k.provider === provider);
    if (!target) return;

    try {
      const res = await fetch(`/api/settings/keys?id=${target.id}`, {
        method: 'DELETE',
        headers: withUserHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        const payload = (data ?? {}) as ApiErrorPayload;
        const safeError = payload.error || 'Delete failed';
        const suffix = payload.code ? ` (code: ${payload.code})` : '';
        const ref = payload.requestId ? ` Ref: ${payload.requestId}` : '';
        throw new Error(`${safeError}${suffix}${ref}`);
      }
      setKeys(keys.filter(k => k.provider !== provider));
      setMessage({ type: 'success', text: 'API key deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    }
  };

  const handleImportPosts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Sign in first to import data.' });
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'posts');

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: withUserHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setMessage({
        type: 'success',
        text: `Import complete: ${data.imported} imported, ${data.skipped} skipped.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">⚙️ Settings</h1>
        <p className="text-gray-400 mb-8">Configure your API keys</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">👤 Authentication</h2>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            {currentUserEmail ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-400">Signed in as</p>
                  <p className="font-medium">{currentUserEmail}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-sm"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div>
                {authRequired && (
                  <p className="text-yellow-300 text-sm mb-3">
                    Please sign in to access protected pages.
                  </p>
                )}
                <p className="text-sm text-gray-400 mb-3">
                  Sign in with email to bind your keys and data to a Supabase user.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                  />
                  <button
                    onClick={handleSignIn}
                    disabled={!authEmail.trim() || authLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm font-medium"
                  >
                    Send Link
                  </button>
                </div>
                <div className="mt-3">
                  <button
                    onClick={handleRunAuthDiagnostics}
                    disabled={authHealthLoading}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-xs"
                  >
                    {authHealthLoading ? 'Running Diagnostics...' : 'Run Auth Diagnostics'}
                  </button>
                </div>
                {authHealth && (
                  <div className="mt-3 p-3 rounded bg-gray-800 border border-gray-700 text-xs space-y-1">
                    <div>Env configured: {authHealth.checks.envConfigured ? 'Yes' : 'No'}</div>
                    <div>Supabase reachable: {authHealth.checks.supabaseUrlReachable ? 'Yes' : 'No'}</div>
                    <div>
                      Email provider likely enabled:{' '}
                      {authHealth.checks.emailProviderLikelyEnabled ? 'Yes' : 'No/Unknown'}
                    </div>
                    {authHealth.status && <div>HTTP status: {authHealth.status}</div>}
                    {authHealth.error && <div>Error: {authHealth.error}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* API Keys Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">🔑 API Keys</h2>
          <p className="text-sm text-gray-500 mb-4">Keys are encrypted server-side and scoped per user ID.</p>
          
          <div className="space-y-4">
            {PROVIDERS.map(provider => {
              const savedKey = keys.find(k => k.provider === provider.id);
              
              return (
                <div key={provider.id} className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{provider.name}</h3>
                      <p className="text-sm text-gray-400">{provider.description}</p>
                    </div>
                    {savedKey && (
                      <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
                        Saved
                      </span>
                    )}
                  </div>
                  
                  {savedKey ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">••••••••••••••••</span>
                      <button
                        onClick={() => handleDeleteKey(provider.id)}
                        disabled={!isAuthenticated}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder={provider.placeholder}
                        value={newKeys[provider.id] || ''}
                        onChange={(e) => setNewKeys({ ...newKeys, [provider.id]: e.target.value })}
                        disabled={provider.id === 'x_api' || loading || !isAuthenticated}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleSaveKey(provider.id)}
                        disabled={provider.id === 'x_api' || loading || !newKeys[provider.id] || !isAuthenticated}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded ${message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {message.text}
            </div>
          )}
        </section>

        {/* Import Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📥 Import Data</h2>
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
            <p className="text-gray-400 mb-4">Upload CSV files to import your post history and analytics.</p>
            
            <div className="space-y-3">
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  id="posts-import"
                  className="hidden"
                  onChange={handleImportPosts}
                  disabled={importing || !isAuthenticated}
                />
                <label htmlFor="posts-import" className="cursor-pointer">
                  <p className="text-blue-400 hover:text-blue-300">
                    {!isAuthenticated ? 'Sign in to import CSV' : importing ? 'Importing...' : 'Click to upload posts CSV'}
                  </p>
                </label>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              CSV format: content, posted_at, impressions, likes, replies, retweets
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
