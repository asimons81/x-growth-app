"use client";

import { useState, useEffect } from 'react';
import { dataApi } from '@/lib/data';

interface Hook {
  id: string;
  hook_text: string;
  hook_type: string;
  created_at: string;
}

const HOOK_TYPES = [
  { value: 'question', label: '❓ Question' },
  { value: 'statement', label: '💡 Statement' },
  { value: 'claim', label: '🔥 Hot Take' },
  { value: 'callout', label: '📢 Callout' },
];

export default function HooksPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHook, setNewHook] = useState('');
  const [hookType, setHookType] = useState('statement');
  
  useEffect(() => {
    loadHooks();
  }, []);
  
  const loadHooks = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getHooks();
      setHooks(data);
    } catch (err) {
      console.error('Failed to load hooks:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const addHook = async () => {
    if (!newHook.trim()) return;
    
    try {
      const saved = await dataApi.createHook(newHook.trim(), hookType);
      setHooks([saved, ...hooks]);
      setNewHook('');
    } catch (err) {
      console.error('Failed to save hook:', err);
    }
  };
  
  const deleteHook = async (id: string) => {
    try {
      await dataApi.deleteHook(id);
      setHooks(hooks.filter(h => h.id !== id));
    } catch (err) {
      console.error('Failed to delete hook:', err);
    }
  };
  
  // Group by type
  const groupedHooks = HOOK_TYPES.map(type => ({
    ...type,
    hooks: hooks.filter(h => h.hook_type === type.value)
  }));
  
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🎣 Hooks</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🎣 Hooks</h1>
        <p className="text-gray-400 mb-8">Save your best opening lines</p>
        
        {/* Add New Hook */}
        <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <textarea
            value={newHook}
            onChange={(e) => setNewHook(e.target.value)}
            placeholder="Write your hook..."
            className="w-full h-20 px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg resize-none mb-4"
          />
          
          <div className="flex flex-wrap gap-2 mb-4">
            {HOOK_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setHookType(type.value)}
                className={`px-3 py-1 rounded-full text-sm ${
                  hookType === type.value 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={addHook}
            disabled={!newHook.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
          >
            Save Hook
          </button>
        </div>
        
        {/* Hooks by Type */}
        {hooks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No hooks saved yet. Add your first hook above!
          </div>
        ) : (
          <div className="space-y-6">
            {groupedHooks.map(group => (
              group.hooks.length > 0 && (
                <div key={group.value}>
                  <h3 className="text-lg font-semibold mb-3">{group.label}</h3>
                  <div className="space-y-2">
                    {group.hooks.map(hook => (
                      <div key={hook.id} className="p-4 bg-gray-900 rounded-lg border border-gray-800 flex justify-between items-start">
                        <p className="text-white">{hook.hook_text}</p>
                        <button
                          onClick={() => deleteHook(hook.id)}
                          className="text-gray-500 hover:text-red-400 ml-4"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
