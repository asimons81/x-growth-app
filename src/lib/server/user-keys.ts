import { supabase } from '@/lib/supabase';
import { decryptSecret, encryptSecret } from './encryption';
import { ensureUserExists } from '@/lib/server-user';

export interface ApiKeyMeta {
  id: string;
  provider: string;
  label: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

export async function listUserApiKeys(userId: string): Promise<ApiKeyMeta[]> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, provider, label, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    provider: row.provider,
    label: row.label,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function saveUserApiKey(
  userId: string,
  provider: string,
  key: string,
  label?: string
) {
  await ensureUserExists(userId);

  const encryptedKey = encryptSecret(key);
  const { data: existing, error: existingError } = await supabase
    .from('user_api_keys')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { data, error } = await supabase
      .from('user_api_keys')
      .update({
        encrypted_key: encryptedKey,
        label: label || `${provider} key`,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, provider, label, is_active, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('user_api_keys')
    .insert({
      user_id: userId,
      provider,
      encrypted_key: encryptedKey,
      label: label || `${provider} key`,
      is_active: true,
    })
    .select('id, provider, label, is_active, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserApiKey(userId: string, id: string) {
  const { error } = await supabase
    .from('user_api_keys')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Gracefully degrade when optional table isn't created yet
    if ((error as { code?: string }).code === 'PGRST205') return null;
    throw error;
  }
  if (!data?.encrypted_key) return null;

  return decryptSecret(data.encrypted_key);
}
