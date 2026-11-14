import type { Metadata } from "next";
import { CommissionsContent } from "@/components/account/commissions-content";

export const metadata: Metadata = { title: "My Commissions" };

export default function CommissionsPage() {
  return <CommissionsContent />;
}
