import { Link, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle2, MessageCircle, ShoppingBag } from 'lucide-react';

interface SuccessLocationState {
  reference?: string;
}

export default function CheckoutSuccessPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as SuccessLocationState;

  if (!state.reference) {
    return <Navigate to="/catalogo" replace />;
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={40} className="text-green-600" />
      </div>

      <h1 className="text-2xl font-bold">Pedido enviado!</h1>
      <p className="text-sm text-brand-black/60 mt-2 max-w-md mx-auto">
        Sua solicitação foi aberta no WhatsApp. A equipe da JR Têxtil vai confirmar
        disponibilidade, frete e condições em breve.
      </p>

      <div className="mt-6 inline-block bg-neutral-100 rounded-lg px-5 py-3">
        <p className="text-[11px] uppercase tracking-wide text-black/50">
          Referência do pedido
        </p>
        <p className="text-lg font-mono font-bold mt-0.5">{state.reference}</p>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg p-4 text-left max-w-md mx-auto space-y-2">
        <p className="flex items-start gap-2">
          <MessageCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Se a janela do WhatsApp não abriu, verifique se o navegador está bloqueando pop-ups.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <ShoppingBag size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Sua sacola foi preservada caso você queira fazer outro pedido.
          </span>
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/catalogo"
          className="px-5 py-3 rounded-lg bg-brand-red hover:bg-brand-redDark text-white font-semibold text-sm"
        >
          Continuar comprando
        </Link>
        <Link
          to="/"
          className="px-5 py-3 rounded-lg border border-black/15 hover:bg-black/5 text-sm font-medium"
        >
          Voltar ao início
        </Link>
      </div>
    </section>
  );
}