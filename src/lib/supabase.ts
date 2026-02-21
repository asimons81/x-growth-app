import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required Supabase env var: ${name}`);
  }
  return value;
}

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

try {
  new URL(supabaseUrl);
} catch {
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL. Expected a full URL like https://<project-ref>.supabase.co');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (use with caution)
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;
