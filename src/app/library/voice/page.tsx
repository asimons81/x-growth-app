"use client";

import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { withUserHeaders } from '@/lib/client-user';
import { useAuthUser } from '@/hooks/useAuthUser';

interface VoiceProfile {
  commonWords: string[];
  sentenceStarts: string[];
  toneKeywords: string[];
  ctaPatterns: string[];
  formalityScore: number;
  avgPostLength: number;
}

export default function VoiceProfilePage() {
  const { isAuthenticated, loading: authLoading } = useAuthUser();
  const [posts, setPosts] = useState('');
  const [postsArray, setPostsArray] = useState<string[]>([]); // For preview
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('voice_profile');
      if (saved) {
        setProfile(JSON.parse(saved) as VoiceProfile);
      }
    } catch {
      // Ignore malformed local voice profile state.
    }
  }, []);
  
  const handleExtract = async () => {
    if (!posts.trim()) return;
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: 'Sign in from Settings to extract your voice profile.' });
      return;
    }
    
    const postList = posts.split('\n').filter(p => p.trim()).slice(0, 50);
    
    if (postList.length < 5) {
      setMessage({ type: 'error', text: 'Please add at least 5 posts for voice extraction' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/ai/voice-extract', {
        method: 'POST',
        headers: withUserHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ posts: postList }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to extract voice');
      }
      
      const data = await res.json();
      setProfile(data.profile);
      localStorage.setItem('voice_profile', JSON.stringify(data.profile));
      setMessage({ type: 'success', text: 'Voice profile extracted!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to extract voice' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    setMessage(null);
    
    try {
      const text = await file.text();
      
      // Use PapaParse for proper CSV handling with quoted fields
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      if (parsed.errors.length > 0) {
        console.warn('CSV parse warnings:', parsed.errors);
      }
      
      const rows = parsed.data as Record<string, string>[];
      console.log('CSV Rows:', rows.length);
      
      // Find the content column
      const headers = Object.keys(rows[0] || {});
      console.log('CSV Headers found:', headers);
      
      // Find content/text/tweet column - prioritize 'text' and 'content', not 'post' (conflicts with 'post id')
      const contentKeywords = ['text', 'content', 'body', 'full_text', 'description'];
      const contentColumn = headers.find(h => {
        const lower = h.toLowerCase().replace(/['"]/g, '').trim();
        console.log(`Checking header: "${h}" -> "${lower}"`);
        return contentKeywords.some(k => lower.includes(k));
      });
      
      console.log('Content column selected:', contentColumn);
      
      let postsArray: string[] = [];
      
      // Find engagement metrics columns
      const impressionsCol = headers.find(h => h.toLowerCase().includes('impression'));
      const likesCol = headers.find(h => h.toLowerCase().includes('like') && !h.toLowerCase().includes('unlike'));
      const engagementsCol = headers.find(h => h.toLowerCase().includes('engagement'));
      
      console.log('Engagement cols:', { impressionsCol, likesCol, engagementsCol });
      
      // If we found engagement columns, sort by them and take top posts
      if (impressionsCol || likesCol || engagementsCol) {
        const scoredRows = rows.map(row => {
          let score = 0;
          if (impressionsCol) score += parseInt(String(row[impressionsCol] || '0')) || 0;
          if (likesCol) score += (parseInt(String(row[likesCol] || '0')) || 0) * 2; // Weight likes more
          if (engagementsCol) score += parseInt(String(row[engagementsCol] || '0')) || 0;
          return { row, score };
        });
        
        // Sort by score descending
        scoredRows.sort((a, b) => b.score - a.score);
        
        // Take top 50
        const topRows = scoredRows.slice(0, 50).map(s => s.row);
        
        if (contentColumn) {
          postsArray = topRows
            .map(row => row[contentColumn as keyof typeof row]?.trim())
            .filter(p => p && p.length > 10);
        }
      } else {
        // No engagement columns found, just take first 50
        if (contentColumn) {
          postsArray = rows
            .slice(0, 50)
            .map(row => row[contentColumn as keyof typeof row]?.trim())
            .filter(p => p && p.length > 10);
        }
      }
      
      console.log('Final content column:', contentColumn);
      
      // DEBUG: Log scores of top 5
      if (postsArray.length > 0) {
        const impressionsCol = headers.find(h => h.toLowerCase().includes('impression'));
        const likesCol = headers.find(h => h.toLowerCase().includes('like') && !h.toLowerCase().includes('unlike'));
        const engagementsCol = headers.find(h => h.toLowerCase().includes('engagement'));
        
        // Re-score to show debug
        rows.slice(0, 10).forEach((row, idx) => {
          let score = 0;
          if (impressionsCol) score += parseInt(String(row[impressionsCol] || '0')) || 0;
          if (likesCol) score += (parseInt(String(row[likesCol] || '0')) || 0) * 2;
          if (engagementsCol) score += parseInt(String(row[engagementsCol] || '0')) || 0;
          console.log(`Row ${idx}: score=${score}, content="${String(row[contentColumn || '']).substring(0, 50)}"`);
        });
      }
      
      if (postsArray.length < 5) {
        // Debug: show what columns we found
        setMessage({ type: 'error', text: `Only found ${postsArray.length} posts. Check CSV format. Found columns: ${headers.join(', ')}` });
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      setPosts(postsArray.slice(0, 50).join('\n'));
      setPostsArray(postsArray.slice(0, 50)); // Store array for preview
      if (postsArray.length > 0) {
        setMessage({ type: 'success', text: `Top ${postsArray.length} posts ready for analysis!` });
      } else {
        setMessage({ type: 'error', text: `No valid posts found. Headers: ${headers.join(', ')}` });
      }
      
    } catch {
      setMessage({ type: 'error', text: 'Failed to parse CSV. Check format.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="min-h-screen p-8 bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🎤 Voice Profile</h1>
        <p className="text-gray-400 mb-8">Train AI on your writing style</p>

        {!authLoading && !isAuthenticated && (
          <div className="mb-6 p-3 rounded bg-yellow-900/30 border border-yellow-800 text-yellow-300 text-sm">
            Voice extraction is disabled until you sign in on the Settings page.
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">1. Import Your Posts</h2>
            <p className="text-gray-400 text-sm mb-4">
              Upload a CSV file with your X posts, or paste them manually.
            </p>
            
            {/* CSV Import */}
            <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVImport}
                className="hidden"
                id="csv-upload"
              />
              <label 
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center cursor-pointer py-4"
              >
                {importing ? (
                  <span className="text-blue-400">Processing...</span>
                ) : (
                  <>
                    <span className="text-blue-400 hover:text-blue-300">📥 Upload CSV</span>
                    <span className="text-xs text-gray-500 mt-1">or click to browse</span>
                  </>
                )}
              </label>
              <p className="text-xs text-gray-500 text-center mt-2">
                CSV should have a &quot;content&quot; or &quot;text&quot; column
              </p>
            </div>
            
            {/* Preview of imported posts */}
            {postsArray.length > 0 ? (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">📋 Preview (Top {postsArray.length} Posts)</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {postsArray.map((post, idx) => (
                    <div key={idx} className="p-3 bg-gray-900 rounded border border-gray-800 text-sm">
                      <span className="text-gray-500 mr-2">{idx + 1}.</span>
                      {post.length > 100 ? post.substring(0, 100) + '...' : post}
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleExtract}
                  disabled={loading || !isAuthenticated}
                  className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
                >
                  {loading ? 'Analyzing...' : 'Extract My Voice'}
                </button>
              </div>
            ) : (
              <div className="mt-6 p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-500">
                  Upload a CSV to preview your top posts here
                </p>
              </div>
            )}
            
            {message && (
              <div className={`mt-4 p-3 rounded ${message.type === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {message.text}
              </div>
            )}
          </div>
          
          {/* Profile Display */}
          <div>
            <h2 className="text-xl font-semibold mb-4">2. Your Voice Profile</h2>
            
            {!profile ? (
              <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-500">
                  Your extracted voice profile will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <h3 className="font-medium mb-2">🎯 Formality Score</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${profile.formalityScore * 10}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">{profile.formalityScore}/10</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {profile.formalityScore <= 3 ? 'Casual & conversational' : 
                     profile.formalityScore <= 6 ? 'Balanced' : 'Professional & formal'}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <h3 className="font-medium mb-2">📏 Avg. Post Length</h3>
                  <p className="text-2xl font-bold">{profile.avgPostLength}</p>
                  <p className="text-xs text-gray-500">words per post</p>
                </div>
                
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <h3 className="font-medium mb-2">🔤 Common Words</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.commonWords.slice(0, 10).map((word, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-800 rounded text-sm">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <h3 className="font-medium mb-2">💬 Tone Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.toneKeywords.slice(0, 8).map((word, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-900/50 rounded text-sm">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <h3 className="font-medium mb-2">✋ CTA Patterns</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.ctaPatterns.slice(0, 5).map((pattern, i) => (
                      <span key={i} className="px-2 py-1 bg-green-900/50 rounded text-sm">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
