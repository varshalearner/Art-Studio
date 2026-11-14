// ============================================================
// Safe storage wrapper for demo mode.
// - Uses localStorage in the browser.
// - Falls back to an in-memory Map on the server and in tests,
//   so the same code runs everywhere.
// - Emits change events so UI (and other tabs) update "live",
//   mimicking Supabase Realtime.
// ============================================================

const memory = new Map<string, string>();

const PREFIX = "aes_"; // amber easel studio

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function storageGet(key: string): string | null {
  const k = PREFIX + key;
  if (hasLocalStorage()) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return memory.get(k) ?? null;
    }
  }
  return memory.get(k) ?? null;
}

export function storageSet(key: string, value: string): void {
  const k = PREFIX + key;
  if (hasLocalStorage()) {
    try {
      window.localStorage.setItem(k, value);
    } catch {
      // quota exceeded or blocked — keep in memory so the session still works
      memory.set(k, value);
    }
  } else {
    memory.set(k, value);
  }
  emitChange(key);
}

export function storageRemove(key: string): void {
  const k = PREFIX + key;
  if (hasLocalStorage()) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* noop */
    }
  }
  memory.delete(k);
  emitChange(key);
}

// ---------------- change events (demo "realtime") ----------------

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function emitChange(key: string) {
  listeners.get(key)?.forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener errors never break writes */
    }
  });
  listeners.get("*")?.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

/** Subscribe to changes of one key ("*" = any). Returns unsubscribe. */
export function storageSubscribe(key: string, fn: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(fn);

  // cross-tab sync via native storage events
  let onStorage: ((e: StorageEvent) => void) | undefined;
  if (typeof window !== "undefined") {
    onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (key === "*" || e.key === PREFIX + key) fn();
    };
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.get(key)?.delete(fn);
    if (onStorage && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** Test helper: wipe everything (memory + localStorage demo keys). */
export function storageClearAll(): void {
  memory.clear();
  if (hasLocalStorage()) {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(PREFIX)) toRemove.push(k);
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  }
}
