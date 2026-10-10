import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type AuthUser = { id: string; name: string; email: string };

function toUser(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const name = (u.user_metadata?.name as string | undefined) || u.email?.split('@')[0] || 'Reader';
  return { id: u.id, name, email: u.email ?? '' };
}

// Current signed-in user (null when signed out or Supabase isn't configured).
export function useAuth(): { user: AuthUser | null; ready: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(toUser(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  return { user, ready };
}

export async function signUp(name: string, email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Accounts are unavailable.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  if (!data.session) throw new Error('Check your email to confirm your account, then sign in.');
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Accounts are unavailable.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
