"use client";

import { useState, useEffect } from 'react';
import { dataApi } from '@/lib/data';
import { withUserHeaders } from '@/lib/client-user';
import { useAuthUser } from '@/hooks/useAuthUser';

interface Draft {
  id: string;
  content: string;
  algorithm_score?: number;
  status: string;
  created_at: string;
}

export default function DraftsPage() {
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDraft, setNewDraft] = useState('');
  const [scoring, setScoring] = useState<string | null>(null);
  
  useEffect(() => {
    loadDrafts();
  }, []);
  
  const loadDrafts = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getDrafts();
      setDrafts(data);
    } catch (err) {
      console.error('Failed to load drafts:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const addDraft = async () => {
    if (!newDraft.trim()) return;
    
    try {
      const saved = await dataApi.createDraft(newDraft.trim());
      setDrafts([saved, ...drafts]);
      setNewDraft('');
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };
  
  const deleteDraft = async (id: string) => {
    try {
      await dataApi.deleteDraft(id);
      setDrafts(drafts.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  };
  
  const scoreDraft = async (id: string) => {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;
    if (!isAuthenticated) return;
    
    setScoring(id);
    
    try {
      const response = await fetch('/api/ai/score', {
        method: 'POST',
        headers: withUserHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: draft.content })
      });
      
      const data = await response.json();
      
      if (data.score) {
        await dataApi.updateDraft(id, draft.content, data.score.overall);
        setDrafts(drafts.map(d => 
          d.id === id ? { ...d, algorithm_score: data.score.overall, status: 'scored' } : d
        ));
      }
    } catch (err) {
      console.error('Scoring failed:', err);
    } finally {
      setScoring(null);
    }
  };
  
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📝 Drafts</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📝 Drafts</h1>
        <p className="text-gray-400 mb-8">Your saved drafts</p>

        {!authLoading && !isAuthenticated && (
          <div className="mb-6 p-3 rounded bg-yellow-900/30 border border-yellow-800 text-yellow-300 text-sm">
            AI scoring is disabled until you sign in on the Settings page.
          </div>
        )}
        
        {/* Add New Draft */}
        <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <textarea
            value={newDraft}
            onChange={(e) => setNewDraft(e.target.value)}
            placeholder="Write your draft..."
            className="w-full h-24 px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg resize-none mb-4"
          />
          
          <button
            onClick={addDraft}
            disabled={!newDraft.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
          >
            Save Draft
          </button>
        </div>
        
        {/* Drafts List */}
        {drafts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No drafts yet. Write your first draft above!
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map(draft => (
              <div key={draft.id} className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {draft.algorithm_score !== undefined && (
                      <span className={`text-2xl font-bold ${getScoreColor(draft.algorithm_score)}`}>
                        {draft.algorithm_score}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => scoreDraft(draft.id)}
                      disabled={scoring === draft.id || !isAuthenticated}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded text-sm"
                    >
                      {scoring === draft.id ? 'Scoring...' : '🎯 Score'}
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-white whitespace-pre-wrap">{draft.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
