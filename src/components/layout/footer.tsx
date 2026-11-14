"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Palette } from "lucide-react";
import { siteConfig } from "@/config";

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className="mt-20 border-t bg-card/60">
      <div className="brush-divider" aria-hidden />
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-display text-lg font-bold">{siteConfig.name}</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
          <p className="font-hand text-lg text-mustard-dark">made with love & a little turpentine</p>
        </div>
        <nav aria-label={t("explore")}>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("explore")}
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/shop">{nav("shop")}</Link></li>
            <li><Link className="hover:text-primary" href="/artists">{nav("artists")}</Link></li>
            <li><Link className="hover:text-primary" href="/commission">{nav("commission")}</Link></li>
            <li><Link className="hover:text-primary" href="/sell">{nav("sell")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("support")}>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("support")}
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/about">{t("aboutUs")}</Link></li>
            <li><Link className="hover:text-primary" href="/faq">{t("faq")}</Link></li>
            <li><Link className="hover:text-primary" href="/contact">{t("contact")}</Link></li>
            <li><Link className="hover:text-primary" href="/setup">Setup checker</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("legal")}>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("legal")}
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-primary" href="/legal/privacy">{t("privacy")}</Link></li>
            <li><Link className="hover:text-primary" href="/legal/terms">{t("terms")}</Link></li>
            <li><Link className="hover:text-primary" href="/legal/refunds">{t("refunds")}</Link></li>
            <li><Link className="hover:text-primary" href="/legal/shipping">{t("shippingPolicy")}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name} · {t("rights")}
      </div>
    </footer>
  );
}
