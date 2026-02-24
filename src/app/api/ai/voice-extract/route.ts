import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai';
import { getRequestUserId, ensureUserExists } from '@/lib/server-user';
import { getUserApiKey } from '@/lib/server/user-keys';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { posts, apiKey: requestApiKey } = await request.json();
    const userId = getRequestUserId(request);
    
    if (!posts || !Array.isArray(posts) || posts.length < 5) {
      return NextResponse.json(
        { error: 'Need at least 5 posts' },
        { status: 400 }
      );
    }
    
    const storedApiKey = await getUserApiKey(userId, 'google');
    const envApiKey = process.env.GEMINI_API_KEY;
    const apiKey = storedApiKey || requestApiKey || envApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key. Add it in Settings.' },
        { status: 400 }
      );
    }
    
    const ai = new AIService(apiKey);
    const profile = await ai.extractVoiceProfile(posts);

    await ensureUserExists(userId);
    await supabase.from('voice_profiles').upsert(
      {
        user_id: userId,
        common_words: profile.commonWords,
        sentence_starts: profile.sentenceStarts,
        tone_keywords: profile.toneKeywords,
        cta_patterns: profile.ctaPatterns,
        formality_score: profile.formalityScore,
        avg_post_length: profile.avgPostLength,
        sample_posts: posts.slice(0, 50),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('Voice extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}
