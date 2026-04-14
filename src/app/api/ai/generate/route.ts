import { NextResponse } from 'next/server';
import { AIService, resolveProvider } from '@/lib/ai';
import { AIProviderType } from '@/lib/ai-providers';
import { VoiceProfileInput, getEnvApiKey } from '@/lib/ai';
import { getRequestUserId } from '@/lib/server-user';
import { getUserApiKey, getUserPreferredProvider } from '@/lib/server/user-keys';
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
    const {
      topic,
      count = 3,
      username = 'User',
      provider: requestedProvider,
      apiKey: requestApiKey,
      voiceProfile,
    } = await request.json();
    const userId = await getRequestUserId(request);

    if (!topic) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 });
    }

    const storedProvider = await getUserPreferredProvider(userId);
    const storedApiKey = storedProvider
      ? await getUserApiKey(userId, storedProvider)
      : null;
    const envApiKey = storedProvider
      ? getEnvApiKey(storedProvider as AIProviderType)
      : getEnvApiKey('gemini');
    const apiKey = requestApiKey || storedApiKey || envApiKey;

    if (!apiKey && requestedProvider !== 'ollama') {
      return NextResponse.json(
        { error: `No API key. Add in Settings.` },
        { status: 400 }
      );
    }

    const { provider } = resolveProvider(
      requestedProvider as AIProviderType | undefined,
      storedProvider as AIProviderType | undefined,
      apiKey
    );

    const ai = new AIService(provider, { apiKey: apiKey || undefined });
    let selectedVoiceProfile: VoiceProfileInput = FALLBACK_VOICE_PROFILE;

    if (voiceProfile && Array.isArray(voiceProfile.commonWords)) {
      selectedVoiceProfile = voiceProfile;
    } else {
      const { data: storedProfile } = await supabase
        .from('voice_profiles')
        .select(
          'common_words, sentence_starts, tone_keywords, cta_patterns, formality_score, avg_post_length'
        )
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

    const drafts = await ai.generateDrafts(
      topic,
      selectedVoiceProfile,
      username,
      count
    );
    const usedFallbackVoiceProfile = selectedVoiceProfile === FALLBACK_VOICE_PROFILE;

    return NextResponse.json({
      drafts,
      meta: { usedFallbackVoiceProfile, provider },
    });
  } catch (err) {
    console.error('Generation error:', err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : JSON.stringify(err);
    return NextResponse.json(
      { error: errorMessage || 'Generation failed' },
      { status: 500 }
    );
  }
}
