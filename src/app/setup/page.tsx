import type { Metadata } from "next";
import { SetupChecker } from "@/components/setup/setup-checker";

export const metadata: Metadata = { title: "Setup checker" };

export default function SetupPage() {
  return <SetupChecker />;
}
