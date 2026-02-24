import { createClient } from '@supabase/supabase-js';

function normalizeEnv(value: string | undefined) {
  return value?.trim().replace(/^"|"$/g, '');
}

const supabaseUrl = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl) {
  throw new Error('Missing required Supabase env var: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required Supabase env var: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

try {
  new URL(supabaseUrl);
} catch {
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL. Expected a full URL like https://<project-ref>.supabase.co');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (use with caution)
const serviceRoleKey = normalizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;
