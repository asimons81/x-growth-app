"use client";

import { useEffect, useState } from 'react';
import { dataApi } from '@/lib/data';

interface DashboardStats {
  totalDrafts: number;
  scheduledPosts: number;
  ideasCount: number;
  voiceProfileReady: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDrafts: 0,
    scheduledPosts: 0,
    ideasCount: 0,
    voiceProfileReady: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [drafts, schedule, ideas] = await Promise.all([
          dataApi.getDrafts(),
          dataApi.getSchedule(),
          dataApi.getIdeas(),
        ]);

        let voiceProfileReady = false;
        try {
          const savedProfile = localStorage.getItem('voice_profile');
          voiceProfileReady = !!savedProfile;
        } catch {
          voiceProfileReady = false;
        }

        setStats({
          totalDrafts: drafts.length,
          scheduledPosts: schedule.length,
          ideasCount: ideas.length,
          voiceProfileReady,
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white pb-24">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📊 Dashboard</h1>
        <p className="text-gray-400 mb-8">Your X growth at a glance</p>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-3xl font-bold text-blue-400">{loading ? '—' : stats.totalDrafts}</div>
            <div className="text-gray-400">Total Drafts</div>
          </div>

          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-3xl font-bold text-green-400">{loading ? '—' : stats.scheduledPosts}</div>
            <div className="text-gray-400">Scheduled</div>
          </div>

          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className="text-3xl font-bold text-purple-400">{loading ? '—' : stats.ideasCount}</div>
            <div className="text-gray-400">Ideas</div>
          </div>

          <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
            <div className={`text-3xl font-bold ${stats.voiceProfileReady ? 'text-yellow-400' : 'text-gray-500'}`}>
              {loading ? '—' : stats.voiceProfileReady ? 'Ready' : 'Not Set'}
            </div>
            <div className="text-gray-400">Voice Profile</div>
          </div>
        </div>

        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a href="/compose" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
              ✍️ New Post
            </a>
            <a href="/schedule" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
              📅 Schedule
            </a>
            <a href="/library/voice" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
              🎤 Voice Profile
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
