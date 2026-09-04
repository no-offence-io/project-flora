"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { cartItemFromProduct, type CartItem } from "@/data/cart";
import type { Product } from "@/data/products";

type CartContextValue = {
  items: CartItem[];
  count: number;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/* Tiny external store: the cart lives here and in local storage, and React subscribes to it. */
const STORAGE_KEY = "flora-cart";
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

  const add = useCallback((product: Product, quantity = 1) => {
    const list = read();
    const existing = list.find((item) => item.id === product.slug);
    write(
      existing
        ? list.map((item) => (item.id === product.slug ? { ...item, quantity: Math.min(10, item.quantity + quantity) } : item))
        : [...list, cartItemFromProduct(product, quantity)],
    );
  }, []);
  const setQuantity = useCallback(
    (id: string, quantity: number) => write(read().map((item) => (item.id === id ? { ...item, quantity } : item))),
    [],
  );
  const remove = useCallback((id: string) => write(read().filter((item) => item.id !== id)), []);

  const value = useMemo(
    () => ({ items, count: items.reduce((sum, item) => sum + item.quantity, 0), add, setQuantity, remove }),
    [items, add, setQuantity, remove],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
