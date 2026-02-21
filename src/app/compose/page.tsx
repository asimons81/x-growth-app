"use client";

import { useState } from 'react';
import { withUserHeaders } from '@/lib/client-user';
import { useAuthUser } from '@/hooks/useAuthUser';

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

export default function ComposePage() {
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [scores, setScores] = useState<Record<number, Score>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getLocalVoiceProfile = () => {
    try {
      const saved = localStorage.getItem('voice_profile');
      if (!saved) return null;
      return JSON.parse(saved) as VoiceProfile;
    } catch {
      return null;
    }
  };
  
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Sign in from Settings to generate AI drafts.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    setDrafts([]);
    setScores({});
    setSelected(null);
    
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: withUserHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          topic,
          count: 3,
          voiceProfile: getLocalVoiceProfile(),
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate');
      }
      
      const data = await res.json();
      setDrafts(data.drafts);
      
      // Auto-score each draft
      for (let i = 0; i < data.drafts.length; i++) {
        await scoreDraft(i, data.drafts[i].content);
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Generation failed' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const scoreDraft = async (index: number, content: string) => {
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: withUserHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setScores(prev => ({ ...prev, [index]: data.score }));
      }
    } catch (err) {
      console.error('Scoring failed:', err);
    }
  };
  
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">✍️ Compose</h1>
        <p className="text-gray-400 mb-8">Generate AI drafts in your voice</p>

        {!authLoading && !isAuthenticated && (
          <div className="mb-6 p-3 rounded bg-yellow-900/30 border border-yellow-800 text-yellow-300 text-sm">
            AI generation is disabled until you sign in on the Settings page.
          </div>
        )}
        
        {/* Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">
            What do you want to post about?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., AI tools, building in public, weekend projects..."
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim() || !isAuthenticated}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded ${message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {message.text}
            </div>
          )}
        </div>
        
        {/* Drafts */}
        {drafts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Generated Drafts</h2>
            
            {drafts.map((draft, i) => (
              <div 
                key={i}
                className={`p-4 bg-gray-900 rounded-lg border transition cursor-pointer ${
                  selected === i ? 'border-blue-500' : 'border-gray-800 hover:border-gray-700'
                }`}
                onClick={() => setSelected(i)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-400">Draft {i + 1}</span>
                  {scores[i] && (
                    <span className={`font-bold ${getScoreColor(scores[i].overall)}`}>
                      {scores[i].overall.toFixed(1)}/10
                    </span>
                  )}
                </div>
                
                <p className="whitespace-pre-wrap mb-3">{draft.content}</p>
                
                <div className="flex gap-4 text-xs text-gray-500 mb-3">
                  <span>🎣 {draft.hook}</span>
                  <span>📐 {draft.angle}</span>
                </div>
                
                {/* Score breakdown */}
                {scores[i] && (
                  <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                    {(['hook', 'clarity', 'novelty', 'value', 'emotion', 'cta', 'readability', 'authenticity'] as const).map(metric => (
                      <div key={metric} className="flex justify-between">
                        <span className="text-gray-500">{metric}</span>
                        <span className={getScoreColor(scores[i][metric])}>{scores[i][metric]}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {scores[i]?.suggestions && scores[i].suggestions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
                    <ul className="text-xs text-gray-400">
                      {scores[i].suggestions.slice(0, 2).map((s, j) => (
                        <li key={j}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(draft.content); }}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
