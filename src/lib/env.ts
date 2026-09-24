export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
} as const;

export function assertEnv(): void {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.');
  }
}