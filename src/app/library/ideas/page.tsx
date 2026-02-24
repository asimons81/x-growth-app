"use client";

import { useState, useEffect } from 'react';
import { dataApi } from '@/lib/data';

interface Idea {
  id: string;
  content: string;
  topics: string[];
  created_at: string;
}

const TOPICS = ['AI', 'Tech', 'Coding', 'Growth', 'Photography', 'UFC', 'Personal', 'News', 'Other'];

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIdea, setNewIdea] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Other');
  const [filterTopic, setFilterTopic] = useState('All');
  
  useEffect(() => {
    loadIdeas();
  }, []);
  
  const loadIdeas = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getIdeas();
      setIdeas(data);
    } catch (err) {
      console.error('Failed to load ideas:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const addIdea = async () => {
    if (!newIdea.trim()) return;
    
    try {
      const saved = await dataApi.createIdea(newIdea.trim(), [selectedTopic]);
      setIdeas([saved, ...ideas]);
      setNewIdea('');
    } catch (err) {
      console.error('Failed to save idea:', err);
    }
  };
  
  const deleteIdea = async (id: string) => {
    try {
      await dataApi.deleteIdea(id);
      setIdeas(ideas.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to delete idea:', err);
    }
  };
  
  const filteredIdeas = filterTopic === 'All' 
    ? ideas 
    : ideas.filter(i => i.topics?.includes(filterTopic));
  
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-950 text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2"> Ideas</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2"> Ideas</h1>
        <p className="text-gray-400 mb-8">Brain dump your content ideas</p>
        
        {/* Add New Idea */}
        <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <textarea
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            placeholder="Quick idea for your next post..."
            className="w-full h-24 px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg resize-none mb-4"
          />
          
          <div className="flex flex-wrap gap-2 mb-4">
            {TOPICS.map(topic => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTopic === topic 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
          
          <button
            onClick={addIdea}
            disabled={!newIdea.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
          >
            Add Idea
          </button>
        </div>
        
        {/* Filter */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilterTopic('All')}
            className={`px-3 py-1 rounded-full text-sm ${
              filterTopic === 'All' ? 'bg-blue-600' : 'bg-gray-800'
            }`}
          >
            All ({ideas.length})
          </button>
          {TOPICS.map(topic => {
            const count = ideas.filter(i => i.topics?.includes(topic)).length;
            if (count === 0) return null;
            return (
              <button
                key={topic}
                onClick={() => setFilterTopic(topic)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterTopic === topic ? 'bg-blue-600' : 'bg-gray-800'
                }`}
              >
                {topic} ({count})
              </button>
            );
          })}
        </div>
        
        {/* Ideas List */}
        {filteredIdeas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No ideas yet. Brain dump some content ideas above!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIdeas.map(idea => (
              <div key={idea.id} className="p-4 bg-gray-900 rounded-lg border border-gray-800 flex justify-between items-start">
                <div className="flex-1">
                  {idea.topics?.map(topic => (
                    <span key={topic} className="inline-block px-2 py-0.5 bg-gray-800 rounded text-xs mr-1">
                      {topic}
                    </span>
                  ))}
                  <p className="text-white mt-2">{idea.content}</p>
                </div>
                <button
                  onClick={() => deleteIdea(idea.id)}
                  className="text-gray-500 hover:text-red-400 ml-4"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
