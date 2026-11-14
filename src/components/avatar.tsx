"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** The ready-made avatars anyone can pick instead of uploading a photo. */
export const PRESET_AVATARS = Array.from(
  { length: 8 },
  (_, i) => `/avatars/avatar-${i + 1}.svg`
);

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Round profile picture. Falls back to the person's initials when there is
 * no photo yet (new live accounts) or the image fails to load.
 * Size it with className (e.g. "h-10 w-10").
 */
export function Avatar({
  src,
  name = "",
  className,
}: {
  src?: string | null;
  name?: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 select-none items-center justify-center rounded-full bg-accent/30 font-display text-[0.8em] font-semibold text-foreground",
          className
        )}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
