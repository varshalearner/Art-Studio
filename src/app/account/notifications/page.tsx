import type { Metadata } from "next";
import { NotificationsContent } from "@/components/account/notifications-content";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <NotificationsContent />;
}
