"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { listReports, resolveReport, removeListing } from "@/services/admin";
import { useAuth } from "@/components/auth-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export function AdminReports() {
  const { user } = useAuth();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: reports = [] } = useQuery({ queryKey: ["admin-reports"], queryFn: listReports });

  if (!user) return <AdminShell title="Reports">{null}</AdminShell>;
  const admin = { id: user.id, name: user.name };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-reports"] });

  return (
    <AdminShell title="Reports & flags">
      {reports.length === 0 ? (
        <EmptyState title="No reports" text="A quiet studio is a happy studio." />
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.targetLabel}{" "}
                    <Badge variant={r.status === "open" ? "mustard" : "muted"} className="ml-1">{r.status}</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">“{r.reason}”</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt, locale)}</p>
                </div>
                {r.status === "open" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        if (r.targetType === "listing") {
                          await removeListing(r.targetId, `Removed after report: ${r.reason}`, admin);
                        }
                        await resolveReport(r.id, "resolved", admin);
                        toast.success("Listing removed and report resolved.");
                        invalidate();
                      }}
                    >
                      <Check className="h-3.5 w-3.5" /> Remove listing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await resolveReport(r.id, "dismissed", admin);
                        toast.success("Report dismissed.");
                        invalidate();
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
