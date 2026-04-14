import {
  AIProviderType,
  ProviderConfig,
  createAIProvider,
  AIProvider,
} from './ai-providers';

// Voice profile extraction prompt
const VOICE_EXTRACTION_PROMPT = `Analyze the EXACT writing style from these actual posts. 

CRITICAL: Only include words, patterns, and characteristics that ACTUALLY appear in these posts. Do NOT invent data.

Analyze and return ONLY this JSON:
{
  "commonWords": [list of 10 words that actually appear most],
  "sentenceStarts": [list of how sentences actually begin],
  "toneKeywords": [list of 5-8 words describing actual tone],
  "ctaPatterns": [list of actual calls-to-action used],
  "formalityScore": 1-10,
  "avgPostLength": number
}

ACTUAL POSTS TO ANALYZE:
{posts}

Return ONLY valid JSON. No explanation.`;

// Draft generation prompt
const DRAFT_GENERATION_PROMPT = `You are {username}, a content creator with this voice profile:
{vprofile}

Generate {count} tweet drafts about: {topic}

Guidelines:
- Match the voice and style from the profile
- Make it engaging and authentic
- Each draft should be different (different angle, hook, length)
- No generic AI-sounding content
- Maximum 280 characters each

Return as JSON array of objects:
[{ "content": "draft text", "hook": "what makes it hook", "angle": "the angle" }]`;

// Algorithm scoring prompt
const SCORING_PROMPT = `Analyze this tweet and score it on these metrics (1-10):

Tweet: "{content}"

Return JSON:
{
  "hook": score,
  "clarity": score,
  "novelty": score,
  "value": score,
  "emotion": score,
  "cta": score,
  "readability": score,
  "authenticity": score,
  "overall": average score,
  "suggestions": ["suggestion1", "suggestion2"]
}`;

// Repurpose prompt
const REPURPOSE_PROMPT = `Take this original post and repurpose it into {count} different formats:

Original: "{content}"

For each format:
- short: Same idea in different words (under 140 chars)
- thread: Expand into a 3-5 tweet thread
- quote: Convert to a quote/statement format
- reply: Turn into a reply-friendly statement

Return JSON:
[
  { "type": "short", "content": "..." },
  { "type": "thread", "content": "..." },
  { "type": "quote", "content": "..." },
  { "type": "reply", "content": "..." }
]`;

export interface VoiceProfileInput {
  commonWords: string[];
  sentenceStarts: string[];
  toneKeywords: string[];
  ctaPatterns: string[];
  formalityScore: number;
  avgPostLength: number;
}

export class AIService {
  private provider: AIProvider;

  constructor(providerType: AIProviderType, config: ProviderConfig) {
    this.provider = createAIProvider(providerType, config);
  }

  async extractVoiceProfile(posts: string[]): Promise<VoiceProfileInput> {
    const prompt = VOICE_EXTRACTION_PROMPT.replace('{posts}', posts.join('\n---\n'));
    return this.provider.generateContentJson<VoiceProfileInput>(prompt);
  }

  async generateDrafts(
    topic: string,
    voiceProfile: VoiceProfileInput,
    username: string,
    count: number = 3
  ): Promise<Array<{ content: string; hook: string; angle: string }>> {
    const prompt = DRAFT_GENERATION_PROMPT
      .replace('{username}', username)
      .replace('{vprofile}', JSON.stringify(voiceProfile))
      .replace('{topic}', topic)
      .replace('{count}', String(count));

    return this.provider.generateContentJson<
      Array<{ content: string; hook: string; angle: string }>
    >(prompt);
  }

  async scorePost(
    content: string
  ): Promise<{
    hook: number;
    clarity: number;
    novelty: number;
    value: number;
    emotion: number;
    cta: number;
    readability: number;
    authenticity: number;
    overall: number;
    suggestions: string[];
  }> {
    const prompt = SCORING_PROMPT.replace('{content}', content);
    return this.provider.generateContentJson<{
      hook: number;
      clarity: number;
      novelty: number;
      value: number;
      emotion: number;
      cta: number;
      readability: number;
      authenticity: number;
      overall: number;
      suggestions: string[];
    }>(prompt);
  }

  async repurposePost(
    content: string,
    count: number = 4
  ): Promise<Array<{ type: string; content: string }>> {
    const prompt = REPURPOSE_PROMPT
      .replace('{content}', content)
      .replace('{count}', String(count));

    return this.provider.generateContentJson<Array<{ type: string; content: string }>>(
      prompt
    );
  }

  async expandIdea(idea: string): Promise<string> {
    const prompt = `Expand this brain dump into multiple postable ideas:\n\n${idea}\n\nReturn as JSON array of expanded ideas:`;
    return this.provider.generateContent(prompt);
  }
}

// Helper to get env var fallback keys per provider
export function getEnvApiKey(provider: AIProviderType): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    case 'anthropic':
      return (
        process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      );
    case 'gemini':
      return (
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY
      );
    case 'ollama':
      return undefined; // Ollama doesn't need an API key
    case 'minimax':
      return process.env.MINIMAX_API_KEY || process.env.NEXT_PUBLIC_MINIMAX_API_KEY;
    default:
      return undefined;
  }
}

// Helper to get provider from request/stored preference
export function resolveProvider(
  requestedProvider?: AIProviderType,
  storedProvider?: AIProviderType,
  apiKey?: string | null
): { provider: AIProviderType; apiKey: string | null } {
  const provider = requestedProvider || storedProvider || 'gemini';
  const key = apiKey || getEnvApiKey(provider) || undefined;
  return { provider, apiKey: key ?? null };
}
