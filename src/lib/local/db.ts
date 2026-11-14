// ============================================================
// Tiny document database over storage.ts for DEMO MODE.
// Collections are JSON arrays; every service's `local`
// implementation reads and writes through here.
// ============================================================

import {
  storageGet,
  storageSet,
  storageSubscribe,
  storageClearAll,
} from "./storage";
import { seedData, SEED_VERSION } from "@/lib/demo-data";

export type CollectionName =
  | "users"
  | "listings"
  | "orders"
  | "commissions"
  | "threads"
  | "messages"
  | "notifications"
  | "reviews"
  | "reports"
  | "audit"
  | "wishlists";

let seeded = false;

/** Seed demo data once per browser (re-seeds when SEED_VERSION bumps). */
export function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  const v = storageGet("seed_version");
  if (v === String(SEED_VERSION)) return;
  const data = seedData();
  (Object.keys(data) as CollectionName[]).forEach((name) => {
    storageSet(name, JSON.stringify(data[name]));
  });
  storageSet("seed_version", String(SEED_VERSION));
}

export function getAll<T>(name: CollectionName): T[] {
  ensureSeeded();
  const raw = storageGet(name);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function setAll<T>(name: CollectionName, rows: T[]): void {
  storageSet(name, JSON.stringify(rows));
}

export function findById<T extends { id: string }>(
  name: CollectionName,
  id: string
): T | undefined {
  return getAll<T>(name).find((r) => r.id === id);
}

export function insert<T extends { id: string }>(name: CollectionName, row: T): T {
  const rows = getAll<T>(name);
  rows.unshift(row);
  setAll(name, rows);
  return row;
}

export function updateById<T extends { id: string }>(
  name: CollectionName,
  id: string,
  patch: Partial<T> | ((row: T) => T)
): T | undefined {
  const rows = getAll<T>(name);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  const next =
    typeof patch === "function" ? patch(rows[idx]) : { ...rows[idx], ...patch };
  rows[idx] = next;
  setAll(name, rows);
  return next;
}

export function removeById(name: CollectionName, id: string): void {
  const rows = getAll<{ id: string }>(name);
  setAll(
    name,
    rows.filter((r) => r.id !== id)
  );
}

/** Subscribe to a collection's changes (demo realtime). Returns unsubscribe. */
export function subscribe(name: CollectionName | "*", fn: () => void): () => void {
  return storageSubscribe(name, fn);
}

// ---------------- session (mock auth) ----------------

export function getSessionUserId(): string | null {
  ensureSeeded();
  return storageGet("session_user");
}

export function setSessionUserId(id: string | null): void {
  if (id) storageSet("session_user", id);
  else storageSet("session_user", "");
}

export function subscribeSession(fn: () => void): () => void {
  return storageSubscribe("session_user", fn);
}

// ---------------- cart (always local, both modes) ----------------

export function getCartRaw(): { listingId: string; qty: number }[] {
  const raw = storageGet("cart");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCartRaw(items: { listingId: string; qty: number }[]): void {
  storageSet("cart", JSON.stringify(items));
}

export function subscribeCart(fn: () => void): () => void {
  return storageSubscribe("cart", fn);
}

/** Test helper — reset the whole demo database. */
export function __resetForTests(): void {
  seeded = false;
  storageClearAll();
}
