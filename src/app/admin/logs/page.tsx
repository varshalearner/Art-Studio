import type { Metadata } from "next";
import { AdminLogs } from "@/components/admin/admin-logs";

export const metadata: Metadata = { title: "Audit log" };

export default function AdminLogsPage() {
  return <AdminLogs />;
}
