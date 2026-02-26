import { supabase } from '@/lib/supabase';

/**
 * SECURITY FIX: Removed DEFAULT_USER_ID fallback.
 * Authentication now requires valid Supabase session.
 * 
 * OLD (INSECURE):
 * const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
 * export function getRequestUserId(request: Request): string {
 *   const userId = request.headers.get('x-user-id')?.trim();
 *   if (userId && UUID_REGEX.test(userId)) return userId;
 *   return DEFAULT_USER_ID;  // <-- ANYONE COULD SPOOF THIS
 * }
 * 
 * NEW (SECURE):
 * - Requires valid Authorization header with Bearer token
 * - Validates session via Supabase
 * - Throws error if no valid session
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Get authenticated user ID from request.
 * Requires valid Supabase session in Authorization header.
 * 
 * @throws Error if no valid authentication
 */
export async function getRequestUserId(request: Request): Promise<string> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header. Format: Bearer <token>');
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer '
  
  // Validate the token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired session. Please re-authenticate.');
  }
  
  return user.id;
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
