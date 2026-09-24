import { supabase } from '@/lib/supabase';
import type { CartItem, DeliveryPreference, OrderIntent } from '@/types/database';

// ---------- Tipos ----------

export interface CreateOrderIntentInput {
  reference: string;
  customerName: string;
  company: string | null;
  city: string;
  phone: string | null;
  deliveryPreference: DeliveryPreference | null;
  notes: string | null;
  estimatedTotal: number;
  items: CartItem[];
}

export interface CreatedOrderResult {
  orderIntentId: string;
  reference: string;
}

// ---------- Criação ----------

/**
 * Cria um "pedido iniciado" com seus itens.
 * Este registro NÃO é confirmação de venda — é um sinal comercial.
 */
export async function createOrderIntent(
  input: CreateOrderIntentInput
): Promise<CreatedOrderResult> {
  // 1) Insere o pedido
  const { data: orderData, error: orderError } = await supabase
    .from('order_intents')
    .insert({
      reference: input.reference,
      customer_name: input.customerName.trim(),
      company: input.company?.trim() || null,
      city: input.city.trim(),
      phone: input.phone?.trim() || null,
      delivery_preference: input.deliveryPreference,
      notes: input.notes?.trim() || null,
      estimated_total: input.estimatedTotal,
      source: 'app-jr-textil-fortaleza',
      status: 'started'
    })
    .select()
    .single();

  if (orderError || !orderData) {
    throw new Error('Não foi possível registrar o pedido. Tente novamente.');
  }

  const orderIntent = orderData as OrderIntent;

  // 2) Insere os itens
  const orderItems = input.items.map((item) => ({
    order_intent_id: orderIntent.id,
    product_id: item.productId,
    variant_id: item.variantId,
    product_name: item.productName,
    product_code: item.productCode,
    color_name: item.colorName,
    unit: item.unit,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100
  }));

  const { error: itemsError } = await supabase
    .from('order_intent_items')
    .insert(orderItems);

  if (itemsError) {
    // Não bloqueia o fluxo — o pedido principal foi criado.
    // O WhatsApp ainda será aberto com a mensagem completa.
    // eslint-disable-next-line no-console
    console.warn('Falha ao salvar os itens do pedido:', itemsError.message);
  }

  return {
    orderIntentId: orderIntent.id,
    reference: orderIntent.reference
  };
}

// ---------- Atualização ----------

/**
 * Marca o pedido como enviado ao WhatsApp.
 */
export async function markOrderAsSent(orderIntentId: string): Promise<void> {
  const { error } = await supabase
    .from('order_intents')
    .update({ status: 'sent_to_whatsapp' })
    .eq('id', orderIntentId);

  if (error) {
    // Não bloqueia a UI
    // eslint-disable-next-line no-console
    console.warn('Não foi possível atualizar o status do pedido.');
  }
}