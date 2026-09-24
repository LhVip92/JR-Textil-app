
export const CART_STORAGE_KEY = 'jr-textil-cart:v1';

/**
 * Verifica se a quantidade atende ao pedido mínimo.
 */
export function isQuantityValid(quantity: number, minQuantity: number): boolean {
  return Number.isFinite(quantity) && quantity >= minQuantity && quantity > 0;
}

/**
 * Cores esgotadas não podem ser selecionadas.
 */
export function isVariantSelectable(status: string): boolean {
  return status !== 'out_of_stock';
}