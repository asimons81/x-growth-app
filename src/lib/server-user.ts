import { supabase } from '@/lib/supabase';

/**
 * Get authenticated user ID from request.
 * 
 * For authenticated requests: validates Bearer token via Supabase.
 * For dev/unauthenticated requests: falls back to x-user-id header (from localStorage).
 * This allows the dashboard to work during development without full auth setup.
 * 
 * In production, always use proper Supabase auth.
 */

// UUID v1-v5 variant: any hex chars, just structure must be valid 8-4-4-4-12
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRequestUserId(request: Request): Promise<string> {
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return user.id;
    }
  }
  
  // Fallback for dev: accept x-user-id header from localStorage
  const devUserId = request.headers.get('x-user-id')?.trim();
  if (devUserId && UUID_REGEX.test(devUserId)) {
    console.warn('[dev] Using x-user-id fallback. Do not use in production.');
    return devUserId;
  }
  
  throw new Error('No valid authentication. Provide Bearer token or x-user-id header.');
}

/**
 * Get user ID synchronously from request (for non-authenticated operations).
 * Returns null if no valid auth header.
 */
export function getOptionalUserId(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  // Note: For sync operations, you may need to validate token differently
  // This is a placeholder - actual validation should be async
  const token = authHeader.slice(7);
  if (!token) return null;
  
  // Return token as potential user ID - actual validation happens async
  // This is a fallback for compatibility
  return null; // Must use getRequestUserId for secure validation
}

export async function ensureUserExists(userId: string) {
  await supabase.from('users').upsert(
    {
      id: userId,
      username: `user_${userId.slice(0, 8)}`,
    },
    { onConflict: 'id' }
  );
}
