import type { CartItem, DeliveryPreference } from '@/types/database';
import { formatBRL } from './money';

// ---------- Tipos ----------

export interface WhatsAppCustomer {
  name: string;
  company: string | null;
  city: string;
  phone: string | null;
  deliveryPreference: DeliveryPreference | null;
  notes: string | null;
}

export interface WhatsAppOrder {
  reference: string;
  customer: WhatsAppCustomer;
  items: CartItem[];
  total: number;
}

// ---------- Geração da mensagem ----------

export function buildWhatsAppMessage(order: WhatsAppOrder): string {
  const lines: string[] = [];

  lines.push('*Novo pedido — App JR Têxtil Fortaleza*');
  lines.push(`Ref: ${order.reference}`);
  lines.push('');

  // Identificação do cliente
  lines.push('*Cliente:*');
  lines.push(`Nome: ${order.customer.name}`);
  if (order.customer.company) {
    lines.push(`Empresa: ${order.customer.company}`);
  }
  lines.push(`Cidade: ${order.customer.city}`);
  if (order.customer.phone) {
    lines.push(`Telefone: ${order.customer.phone}`);
  }
  if (order.customer.deliveryPreference) {
    const label = order.customer.deliveryPreference === 'pickup' ? 'Retirada na loja' : 'Entrega';
    lines.push(`Preferência: ${label}`);
  }
  lines.push('');

  // Itens
  lines.push('*Itens do pedido:*');
  order.items.forEach((item, index) => {
    const subtotal = Math.round(item.unitPrice * item.quantity * 100) / 100;
    lines.push(`${index + 1}. ${item.productName} — ${item.colorName}`);
    lines.push(`   Código: ${item.productCode}`);
    lines.push(
      `   ${item.quantity} ${item.quantity === 1 ? 'rolo' : 'rolos'} × ${formatBRL(item.unitPrice)} = ${formatBRL(subtotal)}`
    );
    lines.push('');
  });

  // Total
  lines.push(`*Total estimado: ${formatBRL(order.total)}*`);
  lines.push('');

  // Observações
  if (order.customer.notes && order.customer.notes.trim() !== '') {
    lines.push('*Observações:*');
    lines.push(order.customer.notes.trim());
    lines.push('');
  }

  // Rodapé
  lines.push('_Pedido iniciado pelo App JR Têxtil Fortaleza._');
  lines.push('_Disponibilidade, frete e condições serão confirmados pela equipe._');

  return lines.join('\n');
}

// ---------- URL do WhatsApp ----------

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// ---------- Referência do pedido ----------

/**
 * Gera uma referência legível no formato JR-YYYYMMDD-XXXX.
 * Exemplo: JR-20250923-4821
 */
export function generateOrderReference(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `JR-${year}${month}${day}-${random}`;
}