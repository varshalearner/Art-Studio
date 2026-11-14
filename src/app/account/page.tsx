import type { Metadata } from "next";
import { ProfileContent } from "@/components/account/profile-content";

export const metadata: Metadata = { title: "My Account" };

export default function AccountPage() {
  return <ProfileContent />;
}
