"use client";

import { useState, useEffect } from 'react';
import { dataApi } from '@/lib/data';

interface Topic {
  id: string;
  topic: string;
  created_at: string;
}

const TOPIC_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState('');
  const [selectedColor, setSelectedColor] = useState(TOPIC_COLORS[0]);
  
  useEffect(() => {
    loadTopics();
  }, []);
  
  const loadTopics = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getTopics();
      setTopics(data);
    } catch (err) {
      console.error('Failed to load topics:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const addTopic = async () => {
    if (!newTopic.trim()) return;
    
    try {
      const saved = await dataApi.createTopic(newTopic.trim(), selectedColor);
      setTopics([...topics, saved]);
      setNewTopic('');
    } catch (err) {
      console.error('Failed to save topic:', err);
    }
  };
  
  const deleteTopic = async (id: string) => {
    try {
      await dataApi.deleteTopic(id);
      setTopics(topics.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  };
  
  const getColorForTopic = (name: string) => {
    const index = topics.findIndex(t => t.topic === name);
    return TOPIC_COLORS[index % TOPIC_COLORS.length];
  };
  
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🏷️ Topics</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🏷️ Topics</h1>
        <p className="text-gray-400 mb-8">Topics you post about</p>
        
        {/* Add New Topic */}
        <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Topic name..."
            className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg mb-4"
          />
          
          <div className="flex flex-wrap gap-2 mb-4">
            {TOPIC_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full ${selectedColor === color ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          
          <button
            onClick={addTopic}
            disabled={!newTopic.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
          >
            Add Topic
          </button>
        </div>
        
        {/* Topics Grid */}
        {topics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No topics yet. Add your first topic above!
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {topics.map(topic => {
              const color = getColorForTopic(topic.topic);
              return (
                <div
                  key={topic.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ backgroundColor: color + '20', border: `1px solid ${color}` }}
                >
                  <span style={{ color }}>{topic.topic}</span>
                  <button
                    onClick={() => deleteTopic(topic.id)}
                    className="text-gray-400 hover:text-red-400 text-sm"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
