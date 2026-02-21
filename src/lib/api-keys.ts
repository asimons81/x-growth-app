// Shared in-memory store for API keys
// In production, replace with Supabase

export const apiKeysStore: Record<string, string> = {};

export function setApiKey(provider: string, key: string) {
  apiKeysStore[provider] = key;
}

export function getApiKey(provider: string): string | undefined {
  return apiKeysStore[provider];
}

export function deleteApiKey(provider: string) {
  delete apiKeysStore[provider];
}
