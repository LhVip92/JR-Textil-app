import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signIn } from '@/services/auth.service';

export default function LoginPage() {
  const { session, loading } = useAuth();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) return <Navigate to={location.state?.from ?? '/admin'} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) setError(result.error ?? 'Não foi possível entrar.');
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 border border-black/5">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-brand-black text-white rounded-full"><Lock size={22} /></div>
        </div>
        <h1 className="text-lg font-bold text-center">Acesso administrativo</h1>
        <p className="text-sm text-black/60 text-center mt-1 mb-5">Área restrita à equipe JR Têxtil.</p>

        <label className="block text-sm font-medium mb-1" htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-3 px-3 py-2 border border-black/15 rounded-lg focus:border-brand-red outline-none" />

        <label className="block text-sm font-medium mb-1" htmlFor="password">Senha</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-3 px-3 py-2 border border-black/15 rounded-lg focus:border-brand-red outline-none" />

        {error && <p role="alert" className="text-sm text-brand-red mb-3">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full bg-brand-red hover:bg-brand-redDark text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}