// Browser-side Supabase client (anon key). Only created when keys exist.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseLive } from "@/config";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseLive) {
    throw new Error(
      "Supabase is not configured. This code path should only run in live mode."
    );
  }
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true } }
    );
    // channel() returns the existing channel when a topic name is reused, and
    // adding listeners to an already-subscribed channel throws. Components
    // re-subscribe on re-render, so every channel gets a unique topic.
    const created = client;
    const originalChannel = created.channel.bind(created);
    created.channel = ((name: string, opts?: Parameters<typeof originalChannel>[1]) =>
      originalChannel(
        `${name}:${Math.random().toString(36).slice(2, 10)}`,
        opts
      )) as typeof created.channel;
  }
  return client;
}
