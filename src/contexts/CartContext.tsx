/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartItem } from '@/types/database';
import { CART_STORAGE_KEY } from '@/domain/cart';
import { computeTotal } from '@/domain/money';

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clear: () => void;
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

// ---------- Persistência ----------

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // silencioso — não bloqueia a UI se localStorage estiver cheio
  }
}

// ---------- Provider ----------

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage());

  // Sincroniza localStorage sempre que a sacola mudar
  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  function addItem(item: CartItem): void {
    setItems((current) => {
      const existingIndex = current.findIndex(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );

      // Já existe → soma quantidade
      if (existingIndex >= 0) {
        const existing = current[existingIndex];
        if (!existing) return current;
        const updated = [...current];
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + item.quantity,
          // Mantém o preço de quando foi adicionado da primeira vez
          unitPrice: existing.unitPrice
        };
        return updated;
      }

      // Novo item
      return [...current, item];
    });
  }

  function removeItem(productId: string, variantId: string): void {
    setItems((current) =>
      current.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  }

  function updateQuantity(productId: string, variantId: string, quantity: number): void {
    setItems((current) =>
      current.map((i) => {
        if (i.productId !== productId || i.variantId !== variantId) return i;
        // Nunca abaixo do mínimo
        const safeQuantity = Math.max(i.minQuantity, Math.floor(quantity));
        return { ...i, quantity: safeQuantity };
      })
    );
  }

  function clear(): void {
    setItems([]);
  }

  // ---------- Derivados ----------

  const itemCount = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity, 0),
    [items]
  );

  const total = useMemo(() => computeTotal(items), [items]);

  const value: CartContextValue = {
    items,
    itemCount,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clear
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}