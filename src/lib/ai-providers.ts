import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type AIProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'minimax';

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AIProvider {
  readonly name: AIProviderType;
  generateContent(prompt: string): Promise<string>;
  generateContentJson<T>(prompt: string): Promise<T>;
}

function extractJsonFromResponse(text: string): string {
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  throw new Error('No JSON found in response');
}

// Gemini Provider
export class GeminiProvider implements AIProvider {
  readonly name: AIProviderType = 'gemini';
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model || 'gemini-2.0-flash';
  }

  async generateContent(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async generateContentJson<T>(prompt: string): Promise<T> {
    const text = await this.generateContent(prompt);
    const jsonStr = extractJsonFromResponse(text);
    return JSON.parse(jsonStr) as T;
  }
}

// OpenAI Provider
export class OpenAIProvider implements AIProvider {
  readonly name: AIProviderType = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o-mini';
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });
    return response.choices[0]?.message?.content || '';
  }

  async generateContentJson<T>(prompt: string): Promise<T> {
    const text = await this.generateContent(prompt);
    const jsonStr = extractJsonFromResponse(text);
    return JSON.parse(jsonStr) as T;
  }
}

// Anthropic Provider
export class AnthropicProvider implements AIProvider {
  readonly name: AIProviderType = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-3-5-haiku-20241107';
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock && 'text' in textBlock ? textBlock.text : '';
  }

  async generateContentJson<T>(prompt: string): Promise<T> {
    const text = await this.generateContent(prompt);
    const jsonStr = extractJsonFromResponse(text);
    return JSON.parse(jsonStr) as T;
  }
}

// Ollama Provider (local)
export class OllamaProvider implements AIProvider {
  readonly name: AIProviderType = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model?: string) {
    this.baseUrl = baseUrl;
    this.model = model || 'llama3.2';
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  async generateContentJson<T>(prompt: string): Promise<T> {
    const text = await this.generateContent(prompt);
    const jsonStr = extractJsonFromResponse(text);
    return JSON.parse(jsonStr) as T;
  }
}

// MiniMax Provider (Hailuo API)
export class MiniMaxProvider implements AIProvider {
  readonly name: AIProviderType = 'minimax';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.minimaxi.chat/v1';
    this.model = model || 'MiniMax-Text-01';
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`MiniMax API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateContentJson<T>(prompt: string): Promise<T> {
    const text = await this.generateContent(prompt);
    const jsonStr = extractJsonFromResponse(text);
    return JSON.parse(jsonStr) as T;
  }
}

// Factory function
export function createAIProvider(type: AIProviderType, config: ProviderConfig): AIProvider {
  switch (type) {
    case 'gemini':
      return new GeminiProvider(config.apiKey || '', config.model);
    case 'openai':
      return new OpenAIProvider(config.apiKey || '', config.model);
    case 'anthropic':
      return new AnthropicProvider(config.apiKey || '', config.model);
    case 'ollama':
      return new OllamaProvider(config.baseUrl, config.model);
    case 'minimax':
      return new MiniMaxProvider(config.apiKey || '', config.model);
    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}

// Provider display names
export const PROVIDER_DISPLAY_NAMES: Record<AIProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  ollama: 'Ollama (Local)',
  minimax: 'MiniMax (Hailuo)',
};

// Default models per provider
export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241107',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.2',
  minimax: 'MiniMax-Text-01',
};
