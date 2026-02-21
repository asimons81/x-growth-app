import { supabase } from '@/lib/supabase';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getRequestUserId(request: Request): string {
  const userId = request.headers.get('x-user-id')?.trim();
  if (userId && UUID_REGEX.test(userId)) return userId;
  return DEFAULT_USER_ID;
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
