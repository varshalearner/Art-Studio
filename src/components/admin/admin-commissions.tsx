"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";
import { listAllCommissions } from "@/services/admin";
import { assignCommissionArtist } from "@/services/commissions";
import { listArtists } from "@/services/artworks";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export function AdminCommissions() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [assigning, setAssigning] = useState<Record<string, string>>({});

  const { data: commissions = [] } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: listAllCommissions,
  });
  const { data: artists = [] } = useQuery({ queryKey: ["artists"], queryFn: listArtists });

  if (!user) return <AdminShell title="Commissions">{null}</AdminShell>;

  return (
    <AdminShell title="Commissions">
      {commissions.length === 0 ? (
        <EmptyState title="No commission requests yet" />
      ) : (
        <div className="space-y-2">
          {commissions.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(c.createdAt, locale)} · budget {format(c.budgetMinInr)}–{format(c.budgetMaxInr)}
                    {c.quoteInr ? ` · quote ${format(c.quoteInr)}` : ""}
                  </p>
                </div>
                <StatusBadge status={c.status} />
                {c.artistId === null && c.status === "submitted" ? (
                  <div className="flex items-center gap-2">
                    <Select
                      aria-label="Assign artist"
                      className="w-44"
                      value={assigning[c.id] ?? ""}
                      onChange={(e) => setAssigning((p) => ({ ...p, [c.id]: e.target.value }))}
                    >
                      <option value="">Choose artist…</option>
                      {artists.map((a) => (
                        <option key={a.id} value={a.id}>{a.displayName}</option>
                      ))}
                    </Select>
                    <Button
                      size="sm"
                      disabled={!assigning[c.id]}
                      onClick={async () => {
                        await assignCommissionArtist(c.id, assigning[c.id]);
                        toast.success("Artist assigned — both sides notified.");
                        queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
                      }}
                      data-testid="assign-artist"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Assign
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    artist: {artists.find((a) => a.id === c.artistId)?.displayName ?? "—"}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
