"use client";

import { useCallback, useEffect, useState } from "react";
import type { CartItem } from "@/types";
import { getCartRaw, setCartRaw, subscribeCart } from "@/lib/local/db";

/** Cart lives client-side in both modes (standard e-commerce pattern). */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCartRaw());
    return subscribeCart(() => setItems(getCartRaw()));
  }, []);

  const add = useCallback((listingId: string, qty = 1) => {
    const current = getCartRaw();
    const existing = current.find((i) => i.listingId === listingId);
    if (existing) existing.qty += qty;
    else current.push({ listingId, qty });
    setCartRaw(current);
  }, []);

  const remove = useCallback((listingId: string) => {
    setCartRaw(getCartRaw().filter((i) => i.listingId !== listingId));
  }, []);

  const setQty = useCallback((listingId: string, qty: number) => {
    const current = getCartRaw();
    const item = current.find((i) => i.listingId === listingId);
    if (item) item.qty = Math.max(1, qty);
    setCartRaw(current);
  }, []);

  const clear = useCallback(() => setCartRaw([]), []);

  const count = items.reduce((s, i) => s + i.qty, 0);

  return { items, add, remove, setQty, clear, count };
}
