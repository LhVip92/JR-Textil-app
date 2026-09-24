const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
  if (!Number.isFinite(value)) return BRL.format(0);
  return BRL.format(value);
}

export function computeSubtotal(unitPrice: number, quantity: number): number {
  if (unitPrice < 0 || quantity <= 0) return 0;
  return Math.round(unitPrice * quantity * 100) / 100;
}

export function computeTotal(items: { unitPrice: number; quantity: number }[]): number {
  return Math.round(items.reduce((acc, i) => acc + computeSubtotal(i.unitPrice, i.quantity), 0) * 100) / 100;
}