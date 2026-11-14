import type { ReactNode } from "react";
import { siteConfig } from "@/config";

/**
 * Shared layout for legal templates. The content below each heading is an
 * editable TEMPLATE — review it with a lawyer before going live.
 */
export function LegalPage({
  title,
  updated = "2026-01-01",
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="container max-w-2xl py-12">
      <h1 className="doodle-underline text-3xl font-bold">{title}</h1>
      <p className="mt-6 text-xs text-muted-foreground">
        {siteConfig.name} · Template last updated {updated}. This is an editable template, not
        legal advice — adapt it to your business and local law before going live.
      </p>
      <div className="prose-sm mt-8 space-y-6 leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
