"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/services/notifications";
import { useAuth } from "@/components/auth-context";
import { AccountShell } from "@/components/account/account-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { timeAgo, cn } from "@/lib/utils";

export function NotificationsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => listNotifications(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.id, () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      queryClient.invalidateQueries({ queryKey: ["unread", user.id] });
    });
  }, [user, queryClient]);

  const markAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    queryClient.invalidateQueries({ queryKey: ["unread", user.id] });
  };

  return (
    <AccountShell title="Notifications">
      <div className="mb-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={markAll}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8 text-mustard-dark" />}
          title="All quiet in the studio"
          text="Status changes, messages and sales will chime in here."
        />
      ) : (
        <ul className="space-y-2" data-testid="notifications-list">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.href}
                onClick={async () => {
                  await markNotificationRead(n.id);
                  queryClient.invalidateQueries({ queryKey: ["unread", user?.id] });
                }}
                className={cn(
                  "block rounded-lg border bg-card p-4 shadow-cozy transition-colors hover:border-primary/50",
                  !n.read && "border-l-4 border-l-primary"
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("text-sm", !n.read && "font-bold")}>{n.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
