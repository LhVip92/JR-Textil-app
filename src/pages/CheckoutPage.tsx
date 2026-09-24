import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useTrackOnMount, useTrack } from '@/hooks/useAnalytics';
import { createOrderIntent, markOrderAsSent } from '@/services/orders.service';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  generateOrderReference,
  type WhatsAppCustomer
} from '@/domain/whatsapp';
import { formatBRL } from '@/domain/money';
import type { DeliveryPreference } from '@/types/database';
import clsx from 'clsx';

const WHATSAPP_NUMBER = '5581993620736';

interface CheckoutForm {
  name: string;
  company: string;
  city: string;
  phone: string;
  deliveryPreference: DeliveryPreference | '';
  notes: string;
}

type FormErrors = Partial<Record<keyof CheckoutForm, string>>;

const emptyForm: CheckoutForm = {
  name: '',
  company: '',
  city: '',
  phone: '',
  deliveryPreference: '',
  notes: ''
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total } = useCart();
  const track = useTrack();

  useTrackOnMount({ eventType: 'checkout_started', source: 'checkout' });

  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  if (items.length === 0) {
    return <Navigate to="/catalogo" replace />;
  }

  function updateField<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const copy = { ...e };
        delete copy[key];
        return copy;
      });
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    const name = form.name.trim();
    if (name.length === 0) {
      newErrors.name = 'Informe seu nome.';
    } else if (name.length > 200) {
      newErrors.name = 'Nome muito longo.';
    }

    const city = form.city.trim();
    if (city.length === 0) {
      newErrors.city = 'Informe a cidade.';
    } else if (city.length > 120) {
      newErrors.city = 'Nome da cidade muito longo.';
    }

    if (form.phone.trim().length > 30) {
      newErrors.phone = 'Telefone muito longo.';
    }

    if (form.notes.trim().length > 2000) {
      newErrors.notes = 'Observações muito longas (máx. 2000 caracteres).';
    }

    if (form.deliveryPreference === '') {
      newErrors.deliveryPreference = 'Escolha uma opção.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    const reference = generateOrderReference();

    const customer: WhatsAppCustomer = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      city: form.city.trim(),
      phone: form.phone.trim() || null,
      deliveryPreference: form.deliveryPreference === '' ? null : form.deliveryPreference,
      notes: form.notes.trim() || null
    };

    try {
      const result = await createOrderIntent({
        reference,
        customerName: customer.name,
        company: customer.company,
        city: customer.city,
        phone: customer.phone,
        deliveryPreference: customer.deliveryPreference,
        notes: customer.notes,
        estimatedTotal: total,
        items
      });

      const message = buildWhatsAppMessage({
        reference: result.reference,
        customer,
        items,
        total
      });

      const url = buildWhatsAppUrl(WHATSAPP_NUMBER, message);

      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        setGeneralError(
          'Não foi possível abrir o WhatsApp. Permita pop-ups neste site e tente novamente.'
        );
        setSubmitting(false);
        return;
      }

      // Registra o clique no WhatsApp
      void track({
        eventType: 'whatsapp_click',
        source: 'checkout',
        metadata: {
          reference: result.reference,
          itemCount: items.length,
          total
        }
      });

      await markOrderAsSent(result.orderIntentId);

      navigate('/checkout/sucesso', {
        state: { reference: result.reference }
      });
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : 'Erro ao enviar o pedido. Tente novamente.'
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <Link
        to="/sacola"
        className="inline-flex items-center gap-1 text-sm text-brand-black/60 hover:text-brand-red mb-4"
      >
        <ArrowLeft size={16} />
        Voltar para a sacola
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold">Identificação</h1>
        <p className="text-sm text-brand-black/60 mt-1">
          Preencha seus dados para enviar o pedido pelo WhatsApp.
        </p>
      </div>

      <div className="bg-neutral-100 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-black/60">
            {items.length} {items.length === 1 ? 'produto' : 'produtos'} na sacola
          </span>
          <span className="font-bold text-lg">{formatBRL(total)}</span>
        </div>
        <p className="text-[11px] text-black/50 mt-1">
          Total estimado — disponibilidade e frete serão confirmados pela equipe.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-lg p-3 mb-4 flex items-start gap-2"
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="co-name" className="block text-sm font-medium mb-1">
            Nome completo <span className="text-brand-red">*</span>
          </label>
          <input
            id="co-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={inputClass(errors.name)}
            placeholder="Ex: Maria Silva"
            autoComplete="name"
            required
          />
          {errors.name && <p className="text-xs text-brand-red mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="co-company" className="block text-sm font-medium mb-1">
            Empresa / Marca <span className="text-black/40 text-xs">(opcional)</span>
          </label>
          <input
            id="co-company"
            type="text"
            value={form.company}
            onChange={(e) => updateField('company', e.target.value)}
            className={inputClass()}
            placeholder="Ex: Loja da Maria"
            autoComplete="organization"
          />
        </div>

        <div>
          <label htmlFor="co-city" className="block text-sm font-medium mb-1">
            Cidade <span className="text-brand-red">*</span>
          </label>
          <input
            id="co-city"
            type="text"
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            className={inputClass(errors.city)}
            placeholder="Ex: Fortaleza"
            autoComplete="address-level2"
            required
          />
          {errors.city && <p className="text-xs text-brand-red mt-1">{errors.city}</p>}
        </div>

        <div>
          <label htmlFor="co-phone" className="block text-sm font-medium mb-1">
            Telefone <span className="text-black/40 text-xs">(opcional)</span>
          </label>
          <input
            id="co-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className={inputClass(errors.phone)}
            placeholder="(85) 99999-9999"
            autoComplete="tel"
          />
          {errors.phone && <p className="text-xs text-brand-red mt-1">{errors.phone}</p>}
        </div>

        <div>
          <span className="block text-sm font-medium mb-2">
            Preferência <span className="text-brand-red">*</span>
          </span>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer select-none transition-colors',
                form.deliveryPreference === 'pickup'
                  ? 'border-brand-red bg-red-50'
                  : 'border-black/15 hover:bg-black/5'
              )}
            >
              <input
                type="radio"
                name="delivery-pref"
                value="pickup"
                checked={form.deliveryPreference === 'pickup'}
                onChange={() => updateField('deliveryPreference', 'pickup')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Retirada</span>
            </label>

            <label
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer select-none transition-colors',
                form.deliveryPreference === 'delivery'
                  ? 'border-brand-red bg-red-50'
                  : 'border-black/15 hover:bg-black/5'
              )}
            >
              <input
                type="radio"
                name="delivery-pref"
                value="delivery"
                checked={form.deliveryPreference === 'delivery'}
                onChange={() => updateField('deliveryPreference', 'delivery')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Entrega</span>
            </label>
          </div>
          {errors.deliveryPreference && (
            <p className="text-xs text-brand-red mt-1">{errors.deliveryPreference}</p>
          )}
        </div>

        <div>
          <label htmlFor="co-notes" className="block text-sm font-medium mb-1">
            Observações <span className="text-black/40 text-xs">(opcional)</span>
          </label>
          <textarea
            id="co-notes"
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className={clsx(inputClass(errors.notes), 'resize-none')}
            placeholder="Ex: Preciso de nota fiscal, prefiro retirar na sexta..."
            rows={3}
          />
          {errors.notes && <p className="text-xs text-brand-red mt-1">{errors.notes}</p>}
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg p-3 flex items-start gap-2">
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Ao clicar em enviar, o WhatsApp abrirá com a mensagem pronta. Basta confirmar o envio por lá.
            A disponibilidade e o frete serão confirmados pela equipe da loja.
          </span>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 p-4 flex items-center gap-3 justify-end z-30">
          <Link
            to="/sacola"
            className="px-4 py-2 rounded-lg border border-black/15 hover:bg-black/5 text-sm"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-60"
          >
            <MessageCircle size={16} />
            {submitting ? 'Enviando...' : 'Enviar pelo WhatsApp'}
          </button>
        </div>
      </form>
    </section>
  );
}

function inputClass(error?: string): string {
  return clsx(
    'w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors bg-white',
    error
      ? 'border-brand-red bg-red-50 focus:border-brand-red'
      : 'border-black/15 focus:border-brand-red'
  );
}