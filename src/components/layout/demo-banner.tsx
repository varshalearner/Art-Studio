"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { demoFlags } from "@/config";

/** Small friendly banner shown while any core service runs in demo mode. */
export function DemoBanner() {
  const t = useTranslations("demo");
  const [dismissed, setDismissed] = useState(false);

  if (!demoFlags.supabase || dismissed) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 bg-mustard/25 px-3 py-1.5 text-center text-xs font-medium text-charcoal dark:text-mustard-light"
      data-testid="demo-banner"
      role="status"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-mustard-dark" aria-hidden />
      <span>
        {t("banner")}{" "}
        <Link href="/setup" className="underline underline-offset-2 hover:text-primary">
          {t("setupLink")}
        </Link>
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-1 rounded-full p-0.5 hover:bg-mustard/40"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
