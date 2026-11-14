import type { ChatMessage, MessageThread, ThreadContext } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapMessage, mapThread } from "@/lib/supabase/mappers";
import { push as notify } from "@/services/notifications/supabase";

export async function listThreads(userId: string): Promise<MessageThread[]> {
  const { data, error } = await getSupabase()
    .from("threads")
    .select("*")
    .contains("participant_ids", [userId])
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapThread);
}

export async function getThread(threadId: string): Promise<MessageThread | null> {
  const { data, error } = await getSupabase()
    .from("threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapThread(data) : null;
}

export async function getOrCreateThread(input: {
  userId: string;
  userName: string;
  otherUserId: string;
  otherUserName: string;
  context: ThreadContext;
  contextLabel: string;
}): Promise<MessageThread> {
  const { data: existing } = await getSupabase()
    .from("threads")
    .select("*")
    .contains("participant_ids", [input.userId, input.otherUserId])
    .eq("context->>type", input.context.type)
    .eq("context->>id", input.context.id)
    .maybeSingle();
  if (existing) return mapThread(existing);
  const { data, error } = await getSupabase()
    .from("threads")
    .insert({
      participant_ids: [input.userId, input.otherUserId],
      participant_names: {
        [input.userId]: input.userName,
        [input.otherUserId]: input.otherUserName,
      },
      context: input.context,
      context_label: input.contextLabel,
      last_message_at: new Date().toISOString(),
      last_message_preview: "",
      unread_by: [],
    })
    .select()
    .single();
  if (error) throw error;
  return mapThread(data);
}

export async function listMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function send(input: {
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
}): Promise<ChatMessage> {
  const { data, error } = await getSupabase()
    .from("messages")
    .insert({
      thread_id: input.threadId,
      sender_id: input.senderId,
      sender_name: input.senderName,
      text: input.text,
      image_url: input.imageUrl ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // The message is saved; thread preview + notifications must not delay or
  // fail the send, so they run in the background.
  void (async () => {
    try {
      const thread = await getThread(input.threadId);
      if (!thread) return;
      await getSupabase()
        .from("threads")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: input.text || "🖼️ Image",
          unread_by: thread.participantIds.filter((id) => id !== input.senderId),
        })
        .eq("id", input.threadId);
      for (const uid of thread.participantIds) {
        if (uid !== input.senderId) {
          void notify({
            userId: uid,
            type: "message",
            title: `New message from ${input.senderName}`,
            body: input.text ? input.text.slice(0, 80) : "Sent an image",
            href: `/messages/${thread.id}`,
          });
        }
      }
    } catch (err) {
      console.warn("Thread preview update failed (non-fatal):", err);
    }
  })();

  return mapMessage(data);
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  const thread = await getThread(threadId);
  // Only write when there is something to clear: every UPDATE fires a realtime
  // event, and subscribers call this again, so an unconditional write loops forever.
  if (!thread || !thread.unreadBy.includes(userId)) return;
  await getSupabase()
    .from("threads")
    .update({ unread_by: thread.unreadBy.filter((id) => id !== userId) })
    .eq("id", threadId);
}

export function subscribeMessages(cb: () => void): () => void {
  const channel = getSupabase()
    .channel("chat:messages")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      () => cb()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "threads" },
      () => cb()
    )
    .subscribe();
  return () => {
    getSupabase().removeChannel(channel);
  };
}
