"use client";

import { useState, useEffect } from 'react';
import { dataApi } from '@/lib/data';

interface ScheduledPost {
  id: string;
  posts: {
    content: string;
  };
  scheduled_for: string;
  status: string;
  created_at: string;
}

export default function SchedulePage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  useEffect(() => {
    loadSchedule();
  }, []);
  
  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await dataApi.getSchedule();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const addToQueue = async () => {
    if (!newPost.trim() || !scheduledTime) return;
    
    try {
      const saved = await dataApi.createSchedule(newPost.trim(), scheduledTime);
      setPosts([...posts, saved].sort((a, b) => 
        new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
      ));
      setNewPost('');
      setScheduledTime('');
    } catch (err) {
      console.error('Failed to schedule post:', err);
    }
  };
  
  const deletePost = async (id: string) => {
    try {
      await dataApi.deleteSchedule(id);
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete scheduled post:', err);
    }
  };
  
  const queuedPosts = posts.filter(p => p.status === 'pending');
  
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-950 text-white pb-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📅 Schedule</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white pb-24">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📅 Schedule</h1>
        <p className="text-gray-400 mb-8">Queue your posts for later</p>
        
        {/* Add to Queue */}
        <div className="mb-8 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full h-24 px-4 py-3 bg-gray-950 border border-gray-800 rounded-lg resize-none mb-4"
          />
          
          <div className="flex gap-4 mb-4">
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="px-4 py-2 bg-gray-950 border border-gray-800 rounded-lg"
            />
            <button
              onClick={addToQueue}
              disabled={!newPost.trim() || !scheduledTime}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
            >
              Schedule
            </button>
          </div>
        </div>
        
        {/* Queue */}
        <h2 className="text-xl font-semibold mb-4">Up Next ({queuedPosts.length})</h2>
        
        {queuedPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No posts scheduled. Add one above!
          </div>
        ) : (
          <div className="space-y-3">
            {queuedPosts.map(post => (
              <div key={post.id} className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-blue-400">
                    {new Date(post.scheduled_for).toLocaleString()}
                  </span>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-white whitespace-pre-wrap">{post.posts?.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
