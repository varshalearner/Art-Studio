"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Brush,
  ClipboardCheck,
  Flag,
  LayoutDashboard,
  Package,
  ScrollText,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/review", label: "Review queue", icon: ClipboardCheck },
  { href: "/admin/users", label: "Users & sellers", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/commissions", label: "Commissions", icon: Brush },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/logs", label: "Audit log", icon: ScrollText },
];

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login?next=/admin");
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="container py-10">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 px-2 font-hand text-xl text-mustard-dark">Studio admin</p>
          <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
            {LINKS.map((l) => {
              const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-muted lg:rounded-md",
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
          <h1 className="doodle-underline mb-8 text-2xl font-bold md:text-3xl">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
