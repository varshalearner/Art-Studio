"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/services/admin";
import { useCurrency } from "@/components/currency-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminOverview() {
  const { format } = useCurrency();
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: getAdminStats });

  return (
    <AdminShell title="Overview">
      {!stats ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/review">
              <Card className="card-lift border-l-4 border-l-mustard">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending listings</p>
                  <p className="font-display text-3xl font-bold" data-testid="pending-count">{stats.pendingListings}</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/users">
              <Card className="card-lift border-l-4 border-l-terracotta">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending sellers</p>
                  <p className="font-display text-3xl font-bold">{stats.pendingSellers}</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/reports">
              <Card className="card-lift border-l-4 border-l-sage">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Open reports</p>
                  <p className="font-display text-3xl font-bold">{stats.openReports}</p>
                </CardContent>
              </Card>
            </Link>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Users</p>
                <p className="font-display text-3xl font-bold">{stats.userCount}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total sales</p>
                <p className="font-display text-2xl font-bold">{format(stats.totalSalesInr)}</p>
                <p className="text-xs text-muted-foreground">{stats.orderCount} paid orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform commission earned</p>
                <p className="font-display text-2xl font-bold text-sage-dark">{format(stats.commissionEarnedInr)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Top artists</p>
                <ol className="space-y-1 text-sm">
                  {stats.topArtists.map((a, i) => (
                    <li key={a.id} className="flex justify-between">
                      <span>{i + 1}. {a.name}</span>
                      <span className="font-semibold">{format(a.salesInr)}</span>
                    </li>
                  ))}
                  {stats.topArtists.length === 0 && <li className="text-muted-foreground">No sales yet</li>}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
