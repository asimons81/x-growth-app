import { NextResponse } from 'next/server';
import { AIService } from '@/lib/ai';
import { getRequestUserId } from '@/lib/server-user';
import { getUserApiKey } from '@/lib/server/user-keys';

export async function POST(request: Request) {
  try {
    const { content, apiKey: requestApiKey } = await request.json();
    const userId = getRequestUserId(request);
    
    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const storedApiKey = await getUserApiKey(userId, 'google');
    const envApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const apiKey = storedApiKey || requestApiKey || envApiKey;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Gemini API key. Add in Settings.' },
        { status: 400 }
      );
    }
    
    const ai = new AIService(apiKey);
    const score = await ai.scorePost(content);
    
    return NextResponse.json({ score });
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
