import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const map: Record<string, string> = {
      'Invalid login credentials': 'E-mail ou senha incorretos.',
      'Email not confirmed': 'E-mail ainda não confirmado.'
    };
    return { ok: false, error: map[error.message] ?? error.message };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return data as Profile | null;
}