import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-brand.red underline">Voltar ao início</Link>
    </section>
  );
}