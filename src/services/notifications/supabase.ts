import type { Notification } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapNotification } from "@/lib/supabase/mappers";

export async function list(userId: string): Promise<Notification[]> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(mapNotification);
}

export async function unreadCount(userId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId);
  if (error) throw error;
}

export function subscribeToNotifications(
  userId: string,
  cb: () => void
): () => void {
  const channel = getSupabase()
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => cb()
    )
    .subscribe();
  return () => {
    getSupabase().removeChannel(channel);
  };
}

/**
 * Notifications are a side effect, never the main action (sending a message,
 * placing an order, approving a listing, ...). If this insert fails — e.g.
 * RLS rejects it, or the network hiccups — it must NOT bubble up and make
 * the caller think the main action failed. So this never throws; it logs
 * and returns null on failure instead.
 */
export async function push(input: {
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  href: string;
}): Promise<Notification | null> {
  // Runs in the background so the main action never waits on it.
  void insertNotification(input);
  return null;
}

async function insertNotification(input: {
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  href: string;
}): Promise<Notification | null> {
  try {
    const { data, error } = await getSupabase()
      .from("notifications")
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      })
      .select()
      .single();
    if (error) throw error;
    // fire-and-forget email via server route (Resend handles live/demo itself)
    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: input.userId,
        subject: input.title,
        text: input.body,
        href: input.href,
      }),
    }).catch(() => undefined);
    return mapNotification(data);
  } catch (err) {
    console.warn("Notification could not be created (non-fatal):", err);
    return null;
  }
}
