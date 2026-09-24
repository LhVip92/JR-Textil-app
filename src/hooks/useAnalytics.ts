import { useEffect, useRef } from 'react';
import { trackEvent, type TrackEventInput } from '@/services/analytics.service';

/**
 * Registra um evento uma vez ao montar o componente.
 * Útil para page_view, catalog_view, product_view.
 *
 * Exemplo:
 *   useTrackOnMount({ eventType: 'page_view', source: 'home' });
 */
export function useTrackOnMount(input: TrackEventInput, deps: unknown[] = []): void {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void trackEvent(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Retorna uma função estável para registrar eventos manualmente.
 * Útil para add_to_cart, remove_from_cart, whatsapp_click, search, filter_applied.
 *
 * Exemplo:
 *   const track = useTrack();
 *   track({ eventType: 'add_to_cart', productId: '...', variantId: '...' });
 */
export function useTrack(): (input: TrackEventInput) => void {
  return (input: TrackEventInput) => {
    void trackEvent(input);
  };
}