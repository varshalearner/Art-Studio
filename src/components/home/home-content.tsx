"use client";

import { Avatar } from "@/components/avatar";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
  Brush,
  CheckCircle2,
  ImagePlus,
  MessagesSquare,
  Quote,
  Sparkles,
} from "lucide-react";
import { getFeaturedArtworks, listArtists } from "@/services/artworks";
import { ArtworkCard } from "@/components/artwork-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { demoFlags } from "@/config";

const TESTIMONIALS = [
  {
    name: "Ritika S., Mumbai",
    text: "I commissioned a painting of my grandmother's kitchen and cried when it arrived. The WIP photos made the wait part of the joy.",
  },
  {
    name: "Tom B., London",
    text: "Bought two watercolors from Priya. Beautifully packed, fair shipping, and the artist even wrote a little note.",
  },
  {
    name: "Aiko M., Osaka",
    text: "As an artist, the approval process keeps the gallery quality high. My first sale happened within a week.",
  },
];

export function HomeContent() {
  const t = useTranslations("home");

  const { data: featured, isLoading: loadingArt } = useQuery({
    queryKey: ["featured"],
    queryFn: getFeaturedArtworks,
  });
  const { data: artists, isLoading: loadingArtists } = useQuery({
    queryKey: ["artists"],
    queryFn: listArtists,
  });

  return (
    <div>
      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-hand text-2xl text-mustard-dark"
          >
            {t("heroEyebrow")}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-6xl"
          >
            <span className="doodle-underline">{t("heroTitle")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="max-w-xl text-base text-muted-foreground md:text-lg"
          >
            {t("heroSubtitle")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" asChild>
              <Link href="/shop" data-testid="hero-browse">{t("browseArt")}</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/sell">{t("startSelling")}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/commission" data-testid="hero-commission">{t("commissionPainting")}</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ---------- featured artworks ---------- */}
      <section className="container py-12" aria-labelledby="featured-art">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="featured-art" className="doodle-underline text-2xl font-bold md:text-3xl">
            {t("featuredArt")}
          </h2>
          <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">
            {t("viewAll")} →
          </Link>
        </div>
        {loadingArt ? (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {(featured ?? []).map((l, i) => (
              <ArtworkCard key={l.id} listing={l} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- how commissions work ---------- */}
      <section className="bg-card/60 py-16" aria-labelledby="how-it-works">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 id="how-it-works" className="doodle-underline text-2xl font-bold md:text-3xl">
              {t("howTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">{t("howSubtitle")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ImagePlus, title: t("how1Title"), text: t("how1Text"), color: "bg-primary/15 text-primary" },
              { icon: MessagesSquare, title: t("how2Title"), text: t("how2Text"), color: "bg-accent/20 text-mustard-dark" },
              { icon: Brush, title: t("how3Title"), text: t("how3Text"), color: "bg-secondary/20 text-sage-dark" },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full card-lift">
                  <CardContent className="flex h-full flex-col items-center gap-4 p-8 text-center">
                    <span className={`rounded-full p-4 ${step.color}`}>
                      <step.icon className="h-7 w-7" aria-hidden />
                    </span>
                    <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button size="lg" asChild>
              <Link href="/commission">{t("commissionPainting")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- featured artists ---------- */}
      <section className="container py-14" aria-labelledby="featured-artists">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="featured-artists" className="doodle-underline text-2xl font-bold md:text-3xl">
            {t("featuredArtists")}
          </h2>
          <Link href="/artists" className="text-sm font-semibold text-primary hover:underline">
            {t("viewAll")} →
          </Link>
        </div>
        {loadingArtists ? (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
            {(artists ?? []).slice(0, 6).map((a) => (
              <Link
                key={a.id}
                href={`/artist/${a.username}`}
                className="group flex flex-col items-center gap-2 rounded-lg border bg-card p-5 text-center shadow-cozy card-lift"
              >
                <span className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-accent/50">
                  <Avatar src={a.avatarUrl} name={a.displayName} className="h-full w-full text-xl" />
                </span>
                <span className="font-display text-sm font-semibold leading-tight">
                  {a.displayName}
                </span>
                <span className="text-xs text-muted-foreground">{a.country}</span>
                {a.verified && (
                  <Badge variant="sage" className="text-[10px]">
                    <CheckCircle2 className="h-3 w-3" /> verified
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ---------- testimonials ---------- */}
      <section className="container pb-16" aria-labelledby="testimonials">
        <div className="mb-8 text-center">
          <h2 id="testimonials" className="doodle-underline text-2xl font-bold md:text-3xl">
            {t("testimonialsTitle")}
          </h2>
          {demoFlags.supabase && (
            <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> {t("sampleNote")}
            </p>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <Card key={item.name} className="card-lift">
              <CardContent className="space-y-3 p-6">
                <Quote className="h-6 w-6 text-accent" aria-hidden />
                <p className="text-sm leading-relaxed">{item.text}</p>
                <p className="font-hand text-lg text-mustard-dark">— {item.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
