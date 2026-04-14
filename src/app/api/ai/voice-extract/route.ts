import { NextResponse } from 'next/server';
import { AIService, resolveProvider, getEnvApiKey } from '@/lib/ai';
import { AIProviderType } from '@/lib/ai-providers';
import { getRequestUserId, ensureUserExists } from '@/lib/server-user';
import { getUserApiKey, getUserPreferredProvider } from '@/lib/server/user-keys';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { posts, provider: requestedProvider, apiKey: requestApiKey } = await request.json();
    const userId = await getRequestUserId(request);

    if (!posts || !Array.isArray(posts) || posts.length < 5) {
      return NextResponse.json(
        { error: 'Need at least 5 posts' },
        { status: 400 }
      );
    }

    const storedProvider = await getUserPreferredProvider(userId);
    const storedApiKey = storedProvider
      ? await getUserApiKey(userId, storedProvider)
      : null;
    const envApiKey = storedProvider ? undefined : getDefaultEnvApiKey(storedProvider || 'gemini');
    const apiKey = requestApiKey || storedApiKey || envApiKey;

    if (!apiKey && requestedProvider !== 'ollama') {
      return NextResponse.json(
        { error: `No API key for ${requestedProvider || 'gemini'}. Add it in Settings.` },
        { status: 400 }
      );
    }

    const { provider } = resolveProvider(
      requestedProvider as AIProviderType | undefined,
      storedProvider as AIProviderType | undefined,
      apiKey
    );

    const ai = new AIService(provider, { apiKey: apiKey || undefined });
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

    return NextResponse.json({ profile, provider });
  } catch (err) {
    console.error('Voice extraction error:', err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : JSON.stringify(err);
    return NextResponse.json(
      { error: errorMessage || 'Extraction failed' },
      { status: 500 }
    );
  }
}

function getDefaultEnvApiKey(provider: string): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    default:
      return undefined;
  }
}
