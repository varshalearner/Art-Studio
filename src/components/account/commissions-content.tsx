"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Brush } from "lucide-react";
import { useLocale } from "next-intl";
import { listMyCommissions } from "@/services/commissions";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { AccountShell } from "@/components/account/account-shell";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export function CommissionsContent() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const locale = useLocale();

  const { data: commissions = [] } = useQuery({
    queryKey: ["my-commissions", user?.id],
    queryFn: () => listMyCommissions(user!.id),
    enabled: !!user,
  });

  return (
    <AccountShell title="My Commissions">
      {commissions.length === 0 ? (
        <EmptyState
          icon={<Brush className="h-8 w-8 text-mustard-dark" />}
          title="No commissions yet"
          text="Dream up a painting and let an artist bring it to life."
          action={<Button asChild><Link href="/commission">Commission a painting</Link></Button>}
        />
      ) : (
        <div className="space-y-4" data-testid="commissions-list">
          {commissions.map((c) => (
            <Link
              key={c.id}
              href={`/account/commissions/${c.id}`}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-cozy card-lift"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(c.createdAt, locale)} · {c.medium.replace("_", " ")} · {c.size}
                </p>
              </div>
              {c.quoteInr ? (
                <span className="text-sm font-semibold text-primary">{format(c.quoteInr)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  budget {format(c.budgetMinInr)}–{format(c.budgetMaxInr)}
                </span>
              )}
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
