const LOCAL_USER_ID_KEY = 'xga_user_id';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export function getOrCreateClientUserId(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_ID;
  }

  const existing = localStorage.getItem(LOCAL_USER_ID_KEY);
  if (existing) return existing;

  const generated = crypto.randomUUID();
  localStorage.setItem(LOCAL_USER_ID_KEY, generated);
  return generated;
}

export function setClientUserId(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_USER_ID_KEY, userId);
}

export function withUserHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    ...headers,
    'x-user-id': getOrCreateClientUserId(),
  };
}
