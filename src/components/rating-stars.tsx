import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  count,
  size = "sm",
  className,
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!rating && !count) return null;
  const px = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={`Rated ${rating} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              px,
              i <= Math.round(rating)
                ? "fill-mustard text-mustard"
                : "fill-muted text-muted"
            )}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">
        {rating > 0 ? rating.toFixed(1) : ""}
        {count ? ` (${count})` : ""}
      </span>
    </span>
  );
}
