"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { listAuditLog } from "@/services/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export function AdminLogs() {
  const locale = useLocale();
  const { data: logs = [] } = useQuery({ queryKey: ["admin-logs"], queryFn: listAuditLog });

  return (
    <AdminShell title="Audit log">
      <p className="mb-4 text-sm text-muted-foreground">
        Every admin action is recorded: who, what, and when.
      </p>
      {logs.length === 0 ? (
        <EmptyState title="No admin actions yet" />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {logs.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-baseline gap-2 px-4 py-3 text-sm">
                <span className="font-semibold">{entry.adminName}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{entry.action}</span>
                <span className="text-muted-foreground">→ {entry.targetType} {entry.targetId}</span>
                {entry.note && <span className="italic text-muted-foreground">“{entry.note}”</span>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDate(entry.createdAt, locale, true)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
