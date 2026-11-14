"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

/** Colour-coded status badges: pending=mustard, approved=sage, changes=terracotta, rejected=grey. */
const VARIANT: Record<string, "mustard" | "sage" | "terracotta" | "grey" | "muted" | "accent"> = {
  draft: "muted",
  pending: "mustard",
  approved: "sage",
  changes_requested: "terracotta",
  rejected: "grey",
  sold: "accent",
  paused: "muted",
  removed: "grey",
  placed: "muted",
  paid: "sage",
  shipped: "mustard",
  delivered: "sage",
  cancelled: "grey",
  refunded: "terracotta",
  submitted: "muted",
  quote_sent: "mustard",
  accepted: "sage",
  deposit_paid: "sage",
  in_progress: "mustard",
  ready: "accent",
  final_paid: "sage",
  declined: "grey",
  edit_pending: "mustard",
};

export function StatusBadge({ status, testId }: { status: string; testId?: string }) {
  const t = useTranslations("status");
  let label: string;
  try {
    label = t(status as never);
  } catch {
    label = status.replace(/_/g, " ");
  }
  return (
    <Badge variant={VARIANT[status] ?? "muted"} data-testid={testId ?? `status-${status}`}>
      {label}
    </Badge>
  );
}
