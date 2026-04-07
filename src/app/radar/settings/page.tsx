"use client";

import { useEffect, useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RadarSettings } from '@/lib/radar/types';

const DEFAULT_WEIGHTS = {
  niche_relevance: 0.24,
  novelty: 0.18,
  momentum: 0.16,
  earlyness: 0.14,
  source_quality: 0.10,
  audience_fit: 0.08,
  actionability: 0.06,
  coverage_gap: 0.04,
};

export default function RadarSettingsPage() {
  const [settings, setSettings] = useState<RadarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keywordsText, setKeywordsText] = useState('');

  useEffect(() => {
    fetch('/api/radar/settings')
      .then((r) => r.json())
      .then((d: { settings: RadarSettings }) => {
        setSettings(d.settings);
        setKeywordsText((d.settings.nicheKeywords ?? []).join(', '));
        setLoading(false);
      });
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const payload = {
      ...settings,
      nicheKeywords: keywordsText.split(',').map((k) => k.trim()).filter(Boolean),
    };
    const res = await fetch('/api/radar/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success('Settings saved');
    } else {
      toast.error('Failed to save');
    }
    setSaving(false);
  }

  function updateWeight(key: string, value: number) {
    if (!settings) return;
    setSettings((prev) => prev ? ({
      ...prev,
      scoreWeights: { ...prev.scoreWeights, [key]: value },
    }) : prev);
  }

  function updateThreshold(key: string, value: number) {
    if (!settings) return;
    setSettings((prev) => prev ? ({
      ...prev,
      scoreThresholds: { ...prev.scoreThresholds, [key]: value },
    }) : prev);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-[#1c1c2e] animate-pulse" />)}
      </div>
    );
  }

  if (!settings) return null;

  const weightTotal = Object.values(settings.scoreWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f1f5f9]">Radar Settings</h1>
          <p className="text-[13px] text-[#94a3b8] mt-0.5">Tune scoring thresholds, weights, and behaviour</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Score thresholds */}
      <SettingCard title="Score Thresholds" description="When clusters change state based on score">
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(settings.scoreThresholds).map(([key, val]) => (
            <div key={key}>
              <label className="block text-[11px] text-[#94a3b8] mb-1 capitalize">{key} (score ≥)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={val}
                onChange={(e) => updateThreshold(key, parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#161625] border border-[#2a2a45] text-[#f1f5f9] text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
      </SettingCard>

      {/* Alert cooldown */}
      <SettingCard title="Alert Behaviour" description="Anti-spam rules for Discord notifications">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-[#94a3b8] mb-1">Cooldown (hours)</label>
            <input
              type="number"
              min={1}
              max={72}
              value={settings.alertCooldownHours}
              onChange={(e) => setSettings((p) => p ? ({ ...p, alertCooldownHours: parseInt(e.target.value) }) : p)}
              className="w-full px-3 py-2 rounded-lg bg-[#161625] border border-[#2a2a45] text-[#f1f5f9] text-sm focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-[#4b5563] mt-1">Min hours between alerts for same cluster</p>
          </div>
          <div>
            <label className="block text-[11px] text-[#94a3b8] mb-1">Score jump override</label>
            <input
              type="number"
              min={5}
              max={50}
              value={settings.scoreJumpOverride}
              onChange={(e) => setSettings((p) => p ? ({ ...p, scoreJumpOverride: parseInt(e.target.value) }) : p)}
              className="w-full px-3 py-2 rounded-lg bg-[#161625] border border-[#2a2a45] text-[#f1f5f9] text-sm focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-[#4b5563] mt-1">Override cooldown if score jumps by this much</p>
          </div>
        </div>
      </SettingCard>

      {/* Cluster lifecycle */}
      <SettingCard title="Cluster Lifecycle" description="How long to keep stale clusters">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-[#94a3b8] mb-1">Max cluster age (days)</label>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.maxClusterAgeDays}
              onChange={(e) => setSettings((p) => p ? ({ ...p, maxClusterAgeDays: parseInt(e.target.value) }) : p)}
              className="w-full px-3 py-2 rounded-lg bg-[#161625] border border-[#2a2a45] text-[#f1f5f9] text-sm focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-[#4b5563] mt-1">Auto-archive clusters older than this</p>
          </div>
          <div>
            <label className="block text-[11px] text-[#94a3b8] mb-1">Fetch interval (minutes)</label>
            <input
              type="number"
              min={5}
              max={60}
              value={settings.ingestionIntervalMin}
              onChange={(e) => setSettings((p) => p ? ({ ...p, ingestionIntervalMin: parseInt(e.target.value) }) : p)}
              className="w-full px-3 py-2 rounded-lg bg-[#161625] border border-[#2a2a45] text-[#f1f5f9] text-sm focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-[#4b5563] mt-1">How often the cron job runs</p>
          </div>
        </div>
      </SettingCard>

      {/* Niche keywords */}
      <SettingCard title="Niche Keywords" description="Boost niche_relevance score when these appear in content">
        <textarea
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          rows={3}
          placeholder="AI, SEO, search, content, creator, WordPress, Google"
          className="w-full px-3 py-2 rounded-lg bg-[#161625] border border-[#2a2a45] text-[#f1f5f9] text-sm focus:outline-none focus:border-indigo-500 resize-none"
        />
        <p className="text-[10px] text-[#4b5563] mt-1">Comma-separated. Case-insensitive.</p>
      </SettingCard>

      {/* Score weights */}
      <SettingCard
        title="Score Weights"
        description={`Dimension weights (must sum to 1.0 — current: ${weightTotal.toFixed(2)})`}
        warning={Math.abs(weightTotal - 1.0) > 0.01 ? `Warning: weights sum to ${weightTotal.toFixed(2)}, not 1.0` : undefined}
      >
        <div className="space-y-3">
          {Object.entries(settings.scoreWeights).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-[12px] text-[#94a3b8] w-36 shrink-0 capitalize">{key.replace(/_/g, ' ')}</label>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={val}
                onChange={(e) => updateWeight(key, parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-[12px] font-medium text-[#f1f5f9] w-10 text-right">{val.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setSettings((p) => p ? ({ ...p, scoreWeights: DEFAULT_WEIGHTS }) : p)}
          className="mt-3 flex items-center gap-1.5 text-[11px] text-[#4b5563] hover:text-[#94a3b8] transition-colors"
        >
          <RotateCcw size={11} /> Reset to defaults
        </button>
      </SettingCard>
    </div>
  );
}

function SettingCard({
  title,
  description,
  children,
  warning,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  warning?: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e35]">
      <h2 className="text-[13px] font-semibold text-[#f1f5f9] mb-0.5">{title}</h2>
      <p className="text-[11px] text-[#4b5563] mb-4">{description}</p>
      {warning && (
        <p className="text-[11px] text-amber-400 mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">{warning}</p>
      )}
      {children}
    </div>
  );
}
