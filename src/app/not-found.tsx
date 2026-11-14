import Link from "next/link";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center gap-4 py-24 text-center">
      <span className="rounded-full bg-accent/20 p-5 animate-wiggle">
        <Palette className="h-10 w-10 text-mustard-dark" aria-hidden />
      </span>
      <h1 className="font-display text-4xl font-bold">This page is still a blank canvas</h1>
      <p className="max-w-md text-muted-foreground">
        The link might be smudged, or the page was never painted. Let&apos;s head back to the gallery.
      </p>
      <Button size="lg" asChild>
        <Link href="/shop">Browse Art</Link>
      </Button>
    </div>
  );
}
