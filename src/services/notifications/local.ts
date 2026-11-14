import type { Notification } from "@/types";
import { getAll, insert, setAll, subscribe, updateById } from "@/lib/local/db";
import { uid, nowIso } from "@/lib/utils";

export async function list(userId: string): Promise<Notification[]> {
  return getAll<Notification>("notifications")
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function unreadCount(userId: string): Promise<number> {
  return (await list(userId)).filter((n) => !n.read).length;
}

export async function markRead(id: string): Promise<void> {
  updateById<Notification>("notifications", id, { read: true });
}

export async function markAllRead(userId: string): Promise<void> {
  const rows = getAll<Notification>("notifications").map((n) =>
    n.userId === userId ? { ...n, read: true } : n
  );
  setAll("notifications", rows);
}

export function subscribeToNotifications(
  _userId: string,
  cb: () => void
): () => void {
  return subscribe("notifications", cb);
}

/** Used internally by other local services (and simulates the email too). */
export async function push(input: {
  userId: string;
  type: Notification["type"];
  title: string;
  body: string;
  href: string;
}): Promise<Notification> {
  const n: Notification = {
    id: uid("n"),
    read: false,
    createdAt: nowIso(),
    ...input,
  };
  insert("notifications", n);
  return n;
}
