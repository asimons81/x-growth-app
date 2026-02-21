"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateClientUserId, setClientUserId } from '@/lib/client-user';

export default function AuthSync() {
  useEffect(() => {
    const syncSessionCookie = async (accessToken?: string | null) => {
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: accessToken ?? null }),
        });
      } catch {
        // Non-blocking: client auth still works.
      }
    };

    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        setClientUserId(data.session.user.id);
        await syncSessionCookie(data.session.access_token);
      } else {
        getOrCreateClientUserId();
        await syncSessionCookie(null);
      }
    };

    sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setClientUserId(session.user.id);
        void syncSessionCookie(session.access_token);
      } else {
        getOrCreateClientUserId();
        void syncSessionCookie(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
