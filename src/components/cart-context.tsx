"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { cartItemFromProduct, lineKey, type CartItem, type LineOptions } from "@/data/cart";
import type { Product } from "@/lib/catalog-types";

type CartContextValue = {
  items: CartItem[];
  count: number;
  add: (product: Product, quantity?: number, options?: LineOptions) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  /** Empty the cart — used once a payment has succeeded. */
  clear: () => void;
};

/** Fired with the piece's name when something is added, for the cart pill. */
export const CART_ADDED = "flora:cart-added";

const CartContext = createContext<CartContextValue | null>(null);

/* Tiny external store: the cart lives here and in local storage, and React subscribes to it. */
const STORAGE_KEY = "flora-cart-v3"; // v3: lines keyed by product + size + measurements
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache === null) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      cache = stored ? (JSON.parse(stored) as CartItem[]) : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

function write(next: CartItem[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): keep the in-memory cart.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Holds the shopping cart for the whole site and keeps it in local storage between visits. */
export function CartProvider({ children }: { children: ReactNode }) {
  // The server renders an empty cart; the client swaps in the stored one right after hydration.
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((product: Product, quantity = 1, options: LineOptions = {}) => {
    const list = read();
    const key = lineKey(product.slug, options);
    const existing = list.find((item) => item.key === key);
    write(
      existing
        ? list.map((item) => (item.key === key ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item))
        : [...list, cartItemFromProduct(product, quantity, options)],
    );
    window.dispatchEvent(new CustomEvent(CART_ADDED, { detail: product.name }));
  }, []);
  const setQuantity = useCallback(
    (key: string, quantity: number) => write(read().map((item) => (item.key === key ? { ...item, quantity } : item))),
    [],
  );
  const remove = useCallback((key: string) => write(read().filter((item) => item.key !== key)), []);
  const clear = useCallback(() => write(EMPTY), []);

  const value = useMemo(
    () => ({ items, count: items.reduce((sum, item) => sum + item.quantity, 0), add, setQuantity, remove, clear }),
    [items, add, setQuantity, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
