"use client";

import { Avatar } from "@/components/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Ban, Undo2 } from "lucide-react";
import { listAllUsers, verifySeller, suspendUser } from "@/services/admin";
import { useAuth } from "@/components/auth-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: listAllUsers });

  if (!user) return <AdminShell title="Users & sellers">{null}</AdminShell>;
  const admin = { id: user.id, name: user.name };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  return (
    <AdminShell title="Users & sellers">
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <Avatar src={u.avatarUrl} name={u.name} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {u.name}
                  {u.role === "admin" && <Badge variant="terracotta" className="ml-2">admin</Badge>}
                  {u.isSeller && <Badge variant="muted" className="ml-2">seller</Badge>}
                  {u.sellerProfile?.verified && <Badge variant="sage" className="ml-2">verified</Badge>}
                  {u.sellerProfile?.suspended && <Badge variant="grey" className="ml-2">suspended</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              {u.isSeller && u.sellerProfile && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={u.sellerProfile.verified ? "ghost" : "secondary"}
                    onClick={async () => {
                      await verifySeller(u.id, !u.sellerProfile!.verified, admin);
                      toast.success(u.sellerProfile!.verified ? "Verification removed." : "Seller verified ✓");
                      invalidate();
                    }}
                    data-testid={`verify-${u.id}`}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {u.sellerProfile.verified ? "Unverify" : "Verify"}
                  </Button>
                  <Button
                    size="sm"
                    variant={u.sellerProfile.suspended ? "outline" : "destructive"}
                    onClick={async () => {
                      await suspendUser(u.id, !u.sellerProfile!.suspended, admin);
                      toast.success(u.sellerProfile!.suspended ? "Seller unsuspended." : "Seller suspended.");
                      invalidate();
                    }}
                  >
                    {u.sellerProfile.suspended ? <Undo2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    {u.sellerProfile.suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
