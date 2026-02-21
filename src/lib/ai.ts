import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
function getGenAI(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

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

export class AIService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async extractVoiceProfile(posts: string[]): Promise<{
    commonWords: string[];
    sentenceStarts: string[];
    toneKeywords: string[];
    ctaPatterns: string[];
    formalityScore: number;
    avgPostLength: number;
  }> {
    const genAI = getGenAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = VOICE_EXTRACTION_PROMPT.replace('{posts}', posts.join('\n---\n'));
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as VoiceProfileInput;
    }
    
    throw new Error('Failed to parse voice profile');
  }
  
  async generateDrafts(
    topic: string, 
    voiceProfile: VoiceProfileInput,
    username: string,
    count: number = 3
  ): Promise<Array<{ content: string; hook: string; angle: string }>> {
    const genAI = getGenAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = DRAFT_GENERATION_PROMPT
      .replace('{username}', username)
      .replace('{vprofile}', JSON.stringify(voiceProfile))
      .replace('{topic}', topic)
      .replace('{count}', String(count));
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Array<{ content: string; hook: string; angle: string }>;
    }
    
    throw new Error('Failed to parse drafts');
  }
  
  async scorePost(content: string): Promise<{
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
    const genAI = getGenAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = SCORING_PROMPT.replace('{content}', content);
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as {
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
      };
    }
    
    throw new Error('Failed to parse score');
  }
  
  async repurposePost(content: string, count: number = 4): Promise<Array<{
    type: string;
    content: string;
  }>> {
    const genAI = getGenAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = REPURPOSE_PROMPT
      .replace('{content}', content)
      .replace('{count}', String(count));
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Array<{ type: string; content: string }>;
    }
    
    throw new Error('Failed to parse repurposed content');
  }
  
  async expandIdea(idea: string): Promise<string> {
    const genAI = getGenAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = `Expand this brain dump into multiple postable ideas:\n\n${idea}\n\nReturn as JSON array of expanded ideas:`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

export interface VoiceProfileInput {
  commonWords: string[];
  sentenceStarts: string[];
  toneKeywords: string[];
  ctaPatterns: string[];
  formalityScore: number;
  avgPostLength: number;
}
