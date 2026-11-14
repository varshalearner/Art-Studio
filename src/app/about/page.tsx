import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Palette, Globe2 } from "lucide-react";
import { siteConfig } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About the studio",
  description: "The story behind the cozy online art studio.",
};

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="doodle-underline text-3xl font-bold md:text-4xl">About the studio</h1>
      <div className="mt-8 space-y-5 leading-relaxed text-foreground/90">
        <p>
          <strong>{siteConfig.name}</strong> began as a simple idea: the internet has plenty of
          places to buy posters, but very few that feel like stepping into an artist&apos;s
          sunlit attic — canvases leaning against the wall, the smell of linseed oil, a kettle
          somewhere in the back.
        </p>
        <p>
          We&apos;re a small marketplace where independent artists from anywhere in the world
          sell their original work, and where anyone can commission a painting made just for
          them. Every listing is reviewed by a human before it goes on the wall, artists are
          verified, and commissions come with progress photos so you watch your piece come to
          life.
        </p>
        <p className="font-hand text-2xl text-mustard-dark">
          Real art, by real hands, for real homes.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          { icon: Palette, title: "Curated, not crowded", text: "Every artwork is approved by the studio before it's listed." },
          { icon: Globe2, title: "Truly global", text: "Multi-currency prices, worldwide shipping, artists on five continents." },
          { icon: Heart, title: "Fair to artists", text: "Transparent commission, quick payouts, and buyers who care." },
        ].map((item) => (
          <Card key={item.title} className="card-lift">
            <CardContent className="space-y-2 p-6 text-center">
              <item.icon className="mx-auto h-7 w-7 text-primary" aria-hidden />
              <h2 className="font-display font-semibold">{item.title}</h2>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Button size="lg" asChild>
          <Link href="/shop">Step into the gallery</Link>
        </Button>
      </div>
    </div>
  );
}
