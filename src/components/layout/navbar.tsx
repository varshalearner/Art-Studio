"use client";

import { Avatar } from "@/components/avatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import {
  Bell,
  Globe,
  Heart,
  Menu,
  MessageCircle,
  Moon,
  Paintbrush,
  Palette,
  Search,
  Shield,
  ShoppingBasket,
  Sun,
  User as UserIcon,
  Wrench,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { siteConfig } from "@/config";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES } from "@/lib/currency";
import { unreadCount } from "@/services/notifications";
import { listThreads } from "@/services/messages";
import { cn } from "@/lib/utils";

function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
}

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { count: cartCount } = useCart();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread", user?.id],
    queryFn: () => unreadCount(user!.id),
    enabled: !!user,
    refetchInterval: 15_000,
  });
  const { data: threads = [] } = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: () => listThreads(user!.id),
    enabled: !!user,
    refetchInterval: 20_000,
  });
  const unreadMessages = threads.filter((th) => th.unreadBy.includes(user?.id ?? "")).length;

  const links = [
    { href: "/shop", label: t("shop") },
    { href: "/artists", label: t("artists") },
    { href: "/commission", label: t("commission") },
    { href: "/sell", label: t("sell") },
    { href: "/about", label: t("about") },
  ];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/shop?q=${encodeURIComponent(search)}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="container flex h-16 items-center gap-3">
        {/* logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={siteConfig.name}>
          <span className="rounded-full bg-primary/15 p-2">
            <Palette className="h-5 w-5 text-primary" aria-hidden />
          </span>
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">
            {siteConfig.name}
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
                pathname === l.href && "bg-muted text-primary"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* search */}
        <form onSubmit={onSearch} className="ml-auto hidden max-w-xs flex-1 md:block" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="h-9 w-full rounded-full border border-input bg-card pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </form>

        <div className="flex items-center gap-0.5">
          {/* currency */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Currency" className="hidden gap-1 px-2 sm:flex">
                <Globe className="h-4 w-4" />
                {currency}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Currency</DropdownMenuLabel>
              {CURRENCIES.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setCurrency(c)} className={cn(c === currency && "font-bold text-primary")}>
                  {c}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Language</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setLocaleCookie("en");
                  router.refresh();
                }}
                className={cn(locale === "en" && "font-bold text-primary")}
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setLocaleCookie("hi");
                  router.refresh();
                }}
                className={cn(locale === "hi" && "font-bold text-primary")}
              >
                हिन्दी
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* theme */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </Button>

          {/* messages */}
          {user && (
            <Link href="/messages" aria-label={t("messages")} className="relative rounded-full p-2 hover:bg-muted">
              <MessageCircle className="h-4 w-4" />
              {unreadMessages > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                  {unreadMessages}
                </span>
              )}
            </Link>
          )}

          {/* notifications */}
          {user && (
            <Link
              href="/account/notifications"
              aria-label={t("notifications")}
              className="relative rounded-full p-2 hover:bg-muted"
              data-testid="notification-bell"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          )}

          {/* cart */}
          <Link href="/cart" aria-label={t("cart")} className="relative rounded-full p-2 hover:bg-muted" data-testid="cart-link">
            <ShoppingBasket className="h-4 w-4" />
            {cartCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
                data-testid="cart-count"
              >
                {cartCount}
              </span>
            )}
          </Link>

          {/* user */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 flex items-center gap-2 rounded-full border bg-card p-1 pr-1 shadow-sm hover:shadow-cozy"
                  aria-label={t("account")}
                  data-testid="user-menu"
                >
                  <Avatar src={user.avatarUrl} name={user.name} className="h-7 w-7" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {user.name}
                  <span className="block text-[11px] font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/account")}>
                  <UserIcon /> {t("account")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/wishlist")}>
                  <Heart /> {t("wishlist")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/sell")}>
                  <Paintbrush /> {t("sell")}
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")} data-testid="admin-link">
                    <Shield /> {t("admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push("/setup")}>
                  <Wrench /> {t("setup")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="logout"
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                >
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              className="ml-1 hidden sm:flex"
              onClick={() => router.push("/login")}
              data-testid="login-button"
            >
              {t("login")}
            </Button>
          )}

          {/* mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* mobile nav drawer */}
      {mobileOpen && (
        <nav className="border-t bg-card px-4 py-3 lg:hidden" aria-label="Mobile">
          <form onSubmit={onSearch} className="mb-3" role="search">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm"
            />
          </form>
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 font-medium hover:bg-muted"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {!user && (
              <li>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md px-3 py-2 font-semibold text-primary hover:bg-muted"
                >
                  {t("login")}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
