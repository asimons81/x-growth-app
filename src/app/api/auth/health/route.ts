import { NextResponse } from 'next/server';
import { createRequestId } from '@/lib/server/errors';

export async function GET() {
  const requestId = createRequestId();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        ok: false,
        checks: {
          envConfigured: false,
          supabaseUrlReachable: false,
        },
        error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
        code: 'AUTH_HEALTH_CONFIG',
        requestId,
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseAnonKey,
      },
      cache: 'no-store',
    });

    let emailProviderLikelyEnabled = false;
    try {
      const json = await response.clone().json();
      const providers = json?.external ?? {};
      emailProviderLikelyEnabled =
        providers.email || providers.smtp || json?.mailer_autoconfirm || false;
    } catch {
      emailProviderLikelyEnabled = false;
    }

    return NextResponse.json({
      ok: response.ok,
      checks: {
        envConfigured: true,
        supabaseUrlReachable: response.ok,
        emailProviderLikelyEnabled,
      },
      status: response.status,
      requestId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Health check failed';
    const lower = message.toLowerCase();
    const code =
      lower.includes('fetch failed') ||
      lower.includes('network') ||
      lower.includes('eai_again') ||
      lower.includes('enotfound')
        ? 'AUTH_HEALTH_NETWORK'
        : 'AUTH_HEALTH_UNKNOWN';

    return NextResponse.json(
      {
        ok: false,
        checks: {
          envConfigured: true,
          supabaseUrlReachable: false,
          emailProviderLikelyEnabled: false,
        },
        error: message,
        code,
        requestId,
      },
      { status: 502 }
    );
  }
}
