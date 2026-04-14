import { NextResponse } from 'next/server';
import { AIService, resolveProvider } from '@/lib/ai';
import { AIProviderType } from '@/lib/ai-providers';
import { getEnvApiKey } from '@/lib/ai';
import { getRequestUserId } from '@/lib/server-user';
import { getUserApiKey, getUserPreferredProvider } from '@/lib/server/user-keys';

export async function POST(request: Request) {
  try {
    const { content, provider: requestedProvider, apiKey: requestApiKey } =
      await request.json();
    const userId = await getRequestUserId(request);

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
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
    const score = await ai.scorePost(content);

    return NextResponse.json({ score, provider });
  } catch (err) {
    console.error('Scoring error:', err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : JSON.stringify(err);
    return NextResponse.json(
      { error: errorMessage || 'Scoring failed' },
      { status: 500 }
    );
  }
}
