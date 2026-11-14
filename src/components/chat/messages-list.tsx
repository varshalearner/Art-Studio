"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { listThreads, subscribeMessages } from "@/services/messages";
import { useAuth } from "@/components/auth-context";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { timeAgo, cn } from "@/lib/utils";

export function MessagesList() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: threads = [] } = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: () => listThreads(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/messages");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    return subscribeMessages(() => {
      queryClient.invalidateQueries({ queryKey: ["threads", user.id] });
    });
  }, [user, queryClient]);

  if (!user) return null;

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="doodle-underline text-3xl font-bold">Messages</h1>
      <div className="mt-10">
        {threads.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-8 w-8 text-mustard-dark" />}
            title="No conversations yet"
            text="Message an artist from any artwork page — ask about sizes, framing, anything."
            action={<Button asChild><Link href="/shop">Browse the gallery</Link></Button>}
          />
        ) : (
          <ul className="space-y-2" data-testid="threads-list">
            {threads.map((t) => {
              const otherId = t.participantIds.find((id) => id !== user.id) ?? "";
              const unread = t.unreadBy.includes(user.id);
              return (
                <li key={t.id}>
                  <Link
                    href={`/messages/${t.id}`}
                    className={cn(
                      "block rounded-lg border bg-card p-4 shadow-cozy transition hover:border-primary/50",
                      unread && "border-l-4 border-l-primary"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate", unread ? "font-bold" : "font-semibold")}>
                        {t.participantNames[otherId] ?? "Conversation"}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(t.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.contextLabel}</p>
                    <p className={cn("mt-1 truncate text-sm", unread ? "font-semibold" : "text-muted-foreground")}>
                      {t.lastMessagePreview || "Say hello 👋"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
