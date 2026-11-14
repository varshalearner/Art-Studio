"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import type { ArtCategory, ArtMedium, ShopFilters, ShippingRegion } from "@/types";
import {
  listApprovedArtworks,
  listArtists,
  getWishlist,
  toggleWishlist,
  subscribeShop,
} from "@/services/artworks";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { ArtworkCard } from "@/components/artwork-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SHIPPING_REGIONS } from "@/lib/regions";
import { toast } from "sonner";

const CATEGORIES: (ArtCategory | "all")[] = ["all", "painting", "sketch", "digital", "portrait", "abstract", "landscape", "still_life"];
const MEDIUMS: (ArtMedium | "all")[] = ["all", "oil", "acrylic", "watercolor", "pencil", "charcoal", "ink", "digital", "mixed_media"];

export function ShopContent() {
  const t = useTranslations("shop");
  const params = useSearchParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ShopFilters>({
    search: params.get("q") ?? "",
    category: (params.get("category") as ArtCategory) ?? "all",
    medium: "all",
    size: "all",
    kind: "all",
    shipsToRegion: "all",
    sort: "newest",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const q = params.get("q");
    if (q !== null) setFilters((f) => ({ ...f, search: q }));
  }, [params]);

  const { data: artworks, isLoading } = useQuery({
    queryKey: ["shop", filters],
    queryFn: () => listApprovedArtworks(filters),
  });

  const { data: artists } = useQuery({ queryKey: ["artists"], queryFn: listArtists });

  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: () => getWishlist(user!.id),
    enabled: !!user,
  });

  // live updates when listings change (approvals appear instantly)
  useEffect(() => {
    return subscribeShop(() => {
      queryClient.invalidateQueries({ queryKey: ["shop"] });
    });
  }, [queryClient]);

  const artistName = useMemo(() => {
    const map = new Map<string, string>();
    (artists ?? []).forEach((a) => map.set(a.id, a.displayName));
    return map;
  }, [artists]);

  const onWishlist = async (listingId: string) => {
    if (!user) {
      toast.info("Log in to save artworks to your wishlist.");
      return;
    }
    await toggleWishlist(user.id, listingId);
    queryClient.invalidateQueries({ queryKey: ["wishlist", user.id] });
  };

  const set = (patch: Partial<ShopFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const filterPanel = (
    <div className="space-y-5" data-testid="shop-filters">
      <div>
        <Label htmlFor="f-category">{t("category")}</Label>
        <Select
          id="f-category"
          className="mt-1"
          value={filters.category}
          onChange={(e) => set({ category: e.target.value as ArtCategory | "all" })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? t("all") : c.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-medium">{t("medium")}</Label>
        <Select
          id="f-medium"
          className="mt-1"
          value={filters.medium}
          onChange={(e) => set({ medium: e.target.value as ArtMedium | "all" })}
        >
          {MEDIUMS.map((m) => (
            <option key={m} value={m}>
              {m === "all" ? t("all") : m.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-artist">{t("artist")}</Label>
        <Select
          id="f-artist"
          className="mt-1"
          value={filters.artistId ?? ""}
          onChange={(e) => set({ artistId: e.target.value || undefined })}
        >
          <option value="">{t("all")}</option>
          {(artists ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-type">{t("type")}</Label>
        <Select
          id="f-type"
          className="mt-1"
          value={filters.kind}
          onChange={(e) => set({ kind: e.target.value as "all" | "physical" | "digital" })}
        >
          <option value="all">{t("all")}</option>
          <option value="physical">{t("physical")}</option>
          <option value="digital">{t("digital")}</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="f-size">{t("size")}</Label>
        <Select
          id="f-size"
          className="mt-1"
          value={filters.size}
          onChange={(e) => set({ size: e.target.value as ShopFilters["size"] })}
        >
          <option value="all">{t("all")}</option>
          <option value="small">{t("small")} (≤ 30×30)</option>
          <option value="medium">{t("mediumSize")} (≤ 60×60)</option>
          <option value="large">{t("large")}</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="f-ships">{t("shipsToMe")}</Label>
        <Select
          id="f-ships"
          className="mt-1"
          value={filters.shipsToRegion}
          onChange={(e) => set({ shipsToRegion: e.target.value as ShippingRegion | "all" })}
        >
          <option value="all">{t("all")}</option>
          {SHIPPING_REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{t("price")} (₹ base)</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="min"
            aria-label="Minimum price"
            value={filters.priceMinInr ?? ""}
            onChange={(e) => set({ priceMinInr: e.target.value ? Number(e.target.value) : undefined })}
          />
          <span aria-hidden>–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="max"
            aria-label="Maximum price"
            value={filters.priceMaxInr ?? ""}
            onChange={(e) => set({ priceMaxInr: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
        {(filters.priceMinInr || filters.priceMaxInr) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {filters.priceMinInr ? format(filters.priceMinInr) : "…"} – {filters.priceMaxInr ? format(filters.priceMaxInr) : "…"}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() =>
          setFilters({ search: "", category: "all", medium: "all", size: "all", kind: "all", shipsToRegion: "all", sort: filters.sort })
        }
      >
        <X className="h-3.5 w-3.5" /> {t("clear")}
      </Button>
    </div>
  );

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="doodle-underline text-3xl font-bold md:text-4xl">{t("title")}</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          type="search"
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value })}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="max-w-sm rounded-full"
          data-testid="shop-search"
        />
        <Select
          aria-label={t("sort")}
          className="w-44"
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as ShopFilters["sort"] })}
        >
          <option value="newest">{t("sortNewest")}</option>
          <option value="price_asc">{t("sortPriceAsc")}</option>
          <option value="price_desc">{t("sortPriceDesc")}</option>
          <option value="rating">{t("sortRating")}</option>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="h-4 w-4" /> {t("filters")}
        </Button>
        <span className="ml-auto text-sm text-muted-foreground" data-testid="shop-count">
          {artworks ? t("results", { count: artworks.length }) : t("filters")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className={`${showFilters ? "block" : "hidden"} rounded-lg border bg-card p-5 shadow-cozy lg:block lg:self-start lg:sticky lg:top-24`} aria-label={t("filters")}>
          {filterPanel}
        </aside>

        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
              ))}
            </div>
          ) : artworks && artworks.length > 0 ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3" data-testid="shop-grid">
              {artworks.map((l, i) => (
                <ArtworkCard
                  key={l.id}
                  listing={l}
                  index={i}
                  artistName={artistName.get(l.sellerId)}
                  onToggleWishlist={onWishlist}
                  wishlisted={wishlist.includes(l.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title={t("empty")} />
          )}
        </div>
      </div>
    </div>
  );
}
