import { Palette } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Friendly empty state: "Your easel is empty — let's find something you love." */
export function EmptyState({
  icon,
  title,
  text,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className
      )}
    >
      <span className="rounded-full bg-accent/20 p-4 text-accent-foreground animate-wiggle">
        {icon ?? <Palette className="h-8 w-8 text-mustard-dark" aria-hidden />}
      </span>
      <h3 className="font-display text-xl">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action}
    </div>
  );
}
