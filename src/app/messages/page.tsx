import type { Metadata } from "next";
import { MessagesList } from "@/components/chat/messages-list";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return <MessagesList />;
}
