"use client";

import { useLocale, useTranslations } from "next-intl";
import type { StatusEvent } from "@/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Small vertical timeline of status changes with dates (local time zone). */
export function Timeline({ events, className }: { events: StatusEvent[]; className?: string }) {
  const t = useTranslations("status");
  const locale = useLocale();
  if (!events.length) return null;
  return (
    <ol className={cn("relative ml-2 space-y-4 border-l-2 border-dashed border-border pl-5", className)}>
      {events.map((e, i) => {
        let label: string;
        try {
          label = t(e.status as never);
        } catch {
          label = e.status.replace(/_/g, " ");
        }
        const latest = i === events.length - 1;
        return (
          <li key={`${e.status}-${e.at}-${i}`} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background",
                latest ? "bg-primary shadow-lamp" : "bg-muted-foreground/50"
              )}
            />
            <p className={cn("text-sm font-semibold", latest && "text-primary")}>{label}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(e.at, locale, true)}
            </p>
            {e.note && <p className="mt-0.5 text-xs italic text-muted-foreground">“{e.note}”</p>}
          </li>
        );
      })}
    </ol>
  );
}
