"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import * as auth from "@/services/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await auth.getCurrentUser();
      // Keep the same object when nothing changed, so effects keyed on the
      // user (realtime subscriptions etc.) don't tear down and restart.
      setUser((prev) =>
        JSON.stringify(prev) === JSON.stringify(u) ? prev : u
      );
    } catch (err) {
      // A failed profile fetch is a network blip, not a logout: keep the
      // current user instead of flashing the login screen.
      console.warn("Could not refresh the current user:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = auth.onAuthChange(() => void refresh());
    return unsub;
  }, [refresh]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
