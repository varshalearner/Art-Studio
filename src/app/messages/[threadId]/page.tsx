import type { Metadata } from "next";
import { ChatThread } from "@/components/chat/chat-thread";

export const metadata: Metadata = { title: "Chat" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <ChatThread threadId={threadId} />;
}
