import type { ChatMessage, MessageThread, ThreadContext } from "@/types";
import {
  findById,
  getAll,
  insert,
  subscribe,
  updateById,
} from "@/lib/local/db";
import { uid, nowIso, rateLimit } from "@/lib/utils";
import { push as notify } from "@/services/notifications/local";

export async function listThreads(userId: string): Promise<MessageThread[]> {
  return getAll<MessageThread>("threads")
    .filter((t) => t.participantIds.includes(userId))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export async function getThread(threadId: string): Promise<MessageThread | null> {
  return findById<MessageThread>("threads", threadId) ?? null;
}

export async function getOrCreateThread(input: {
  userId: string;
  userName: string;
  otherUserId: string;
  otherUserName: string;
  context: ThreadContext;
  contextLabel: string;
}): Promise<MessageThread> {
  const existing = getAll<MessageThread>("threads").find(
    (t) =>
      t.participantIds.includes(input.userId) &&
      t.participantIds.includes(input.otherUserId) &&
      t.context.type === input.context.type &&
      t.context.id === input.context.id
  );
  if (existing) return existing;
  const thread: MessageThread = {
    id: uid("t"),
    participantIds: [input.userId, input.otherUserId],
    participantNames: {
      [input.userId]: input.userName,
      [input.otherUserId]: input.otherUserName,
    },
    context: input.context,
    contextLabel: input.contextLabel,
    lastMessageAt: nowIso(),
    lastMessagePreview: "",
    unreadBy: [],
    createdAt: nowIso(),
  };
  insert("threads", thread);
  return thread;
}

export async function listMessages(threadId: string): Promise<ChatMessage[]> {
  return getAll<ChatMessage>("messages")
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function send(input: {
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  replyToId?: string;
}): Promise<ChatMessage> {
  if (!rateLimit(`msg_${input.senderId}`, 30, 60 * 1000)) {
    throw new Error("Slow down a little — too many messages in a minute.");
  }
  const message: ChatMessage = {
    id: uid("m"),
    threadId: input.threadId,
    senderId: input.senderId,
    senderName: input.senderName,
    text: input.text,
    imageUrl: input.imageUrl,
    replyToId: input.replyToId,
    reactions: {},
    createdAt: nowIso(),
  };
  insert("messages", message);
  const thread = updateById<MessageThread>("threads", input.threadId, (t) => ({
    ...t,
    lastMessageAt: message.createdAt,
    lastMessagePreview: input.text || "🖼️ Image",
    unreadBy: t.participantIds.filter((id) => id !== input.senderId),
  }));
  if (thread) {
    for (const uid of thread.participantIds) {
      if (uid !== input.senderId) {
        await notify({
          userId: uid,
          type: "message",
          title: `New message from ${input.senderName}`,
          body: input.text ? input.text.slice(0, 80) : "Sent an image",
          href: `/messages/${thread.id}`,
        });
      }
    }
  }
  return message;
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  // Only write when there is something to clear: each write notifies
  // subscribers, who call this again, so an unconditional write recurses forever.
  const current = findById<MessageThread>("threads", threadId);
  if (!current || !current.unreadBy.includes(userId)) return;
  updateById<MessageThread>("threads", threadId, (t) => ({
    ...t,
    unreadBy: t.unreadBy.filter((id) => id !== userId),
  }));
}

/** Set (or with null, remove) this person's reaction on a message. */
export async function react(
  messageId: string,
  userId: string,
  emoji: string | null
): Promise<void> {
  updateById<ChatMessage>("messages", messageId, (m) => {
    const reactions = { ...(m.reactions ?? {}) };
    if (emoji) reactions[userId] = emoji;
    else delete reactions[userId];
    return { ...m, reactions };
  });
}

export function subscribeMessages(cb: () => void): () => void {
  const a = subscribe("messages", cb);
  const b = subscribe("threads", cb);
  return () => {
    a();
    b();
  };
}
