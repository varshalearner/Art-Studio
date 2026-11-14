"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Bell, Brush, Package, Settings, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Profile", icon: UserIcon },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/commissions", label: "Commissions", icon: Brush },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export function AccountShell({ children, title }: { children: ReactNode; title?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="container py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav aria-label="Account" className="flex gap-1 overflow-x-auto md:flex-col">
            {LINKS.map((l) => {
              const active =
                l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-muted md:rounded-md",
                    active && "bg-muted text-primary"
                  )}
                >
                  <l.icon className="h-4 w-4" /> {l.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div>
          {title && <h1 className="doodle-underline mb-8 text-2xl font-bold md:text-3xl">{title}</h1>}
          {children}
        </div>
      </div>
    </div>
  );
}
