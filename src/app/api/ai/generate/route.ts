import { NextResponse } from 'next/server';
import { AIService, VoiceProfileInput } from '@/lib/ai';
import { getRequestUserId } from '@/lib/server-user';
import { getUserApiKey } from '@/lib/server/user-keys';
import { supabase } from '@/lib/supabase';

const FALLBACK_VOICE_PROFILE: VoiceProfileInput = {
  commonWords: ['the', 'and', 'to', 'a', 'of', 'in', 'is', 'it', 'for', 'you'],
  sentenceStarts: ['I', 'The', 'If', 'When', 'This'],
  toneKeywords: ['direct', 'practical', 'honest'],
  ctaPatterns: ['check out', 'let me know', 'what do you think'],
  formalityScore: 5,
  avgPostLength: 120,
};

export async function POST(request: Request) {
  try {
    const { topic, count = 3, username = 'User', apiKey: requestApiKey, voiceProfile } = await request.json();
    const userId = getRequestUserId(request);
    
    if (!topic) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 });
    }

    const storedApiKey = await getUserApiKey(userId, 'google');
    const envApiKey = process.env.GEMINI_API_KEY;
    const apiKey = storedApiKey || requestApiKey || envApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key. Add in Settings.' },
        { status: 400 }
      );
    }
    
    const ai = new AIService(apiKey);
    let selectedVoiceProfile: VoiceProfileInput = FALLBACK_VOICE_PROFILE;

    if (voiceProfile && Array.isArray(voiceProfile.commonWords)) {
      selectedVoiceProfile = voiceProfile;
    } else {
      const { data: storedProfile } = await supabase
        .from('voice_profiles')
        .select('common_words, sentence_starts, tone_keywords, cta_patterns, formality_score, avg_post_length')
        .eq('user_id', userId)
        .maybeSingle();

      if (storedProfile) {
        selectedVoiceProfile = {
          commonWords: storedProfile.common_words || [],
          sentenceStarts: storedProfile.sentence_starts || [],
          toneKeywords: storedProfile.tone_keywords || [],
          ctaPatterns: storedProfile.cta_patterns || [],
          formalityScore: storedProfile.formality_score || 5,
          avgPostLength: storedProfile.avg_post_length || 120,
        };
      }
    }

    const drafts = await ai.generateDrafts(topic, selectedVoiceProfile, username, count);
    const usedFallbackVoiceProfile = selectedVoiceProfile === FALLBACK_VOICE_PROFILE;

    return NextResponse.json({
      drafts,
      meta: { usedFallbackVoiceProfile },
    });
  } catch (err) {
    console.error('Generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
