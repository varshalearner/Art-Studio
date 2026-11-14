"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import type { ArtCategory, ArtMedium, ShippingRegion } from "@/types";
import {
  createListing,
  getListingById,
  submitListingForReview,
  updateListing,
} from "@/services/listings";
import { uploadFile } from "@/services/storage";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SHIPPING_REGIONS, DEFAULT_SHIPPING_RATES } from "@/lib/regions";
import { fileToDataUrl, cn } from "@/lib/utils";

const CATEGORIES: ArtCategory[] = ["painting", "sketch", "digital", "portrait", "abstract", "landscape", "still_life"];
const MEDIUMS: ArtMedium[] = ["oil", "acrylic", "watercolor", "pencil", "charcoal", "ink", "digital", "mixed_media"];

export function ListingForm({ listingId }: { listingId?: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { format } = useCurrency();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => getListingById(listingId!),
    enabled: !!listingId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ArtCategory>("painting");
  const [medium, setMedium] = useState<ArtMedium>("oil");
  const [widthCm, setWidthCm] = useState(40);
  const [heightCm, setHeightCm] = useState(50);
  const [priceInr, setPriceInr] = useState(5000);
  const [kind, setKind] = useState<"physical" | "digital">("physical");
  const [stock, setStock] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [shipsTo, setShipsTo] = useState<ShippingRegion[]>(["india"]);
  const [rates, setRates] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_SHIPPING_RATES.map((r) => [r.region, r.rateInr]))
  );
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/sell");
  }, [loading, user, router]);

  useEffect(() => {
    if (existing && !loaded) {
      setLoaded(true);
      const src = existing.pendingEdit ?? existing;
      setTitle(src.title);
      setDescription(src.description);
      setCategory(existing.category);
      setMedium(existing.medium);
      setWidthCm(existing.widthCm);
      setHeightCm(existing.heightCm);
      setPriceInr(src.priceInr);
      setKind(existing.kind);
      setStock(existing.stock);
      setImages(src.images);
      setShipsTo(existing.shipsTo.length ? existing.shipsTo : ["india"]);
      setRates((r) => ({
        ...r,
        ...Object.fromEntries(existing.shippingRates.map((x) => [x.region, x.rateInr])),
      }));
    }
  }, [existing, loaded]);

  if (!user) return null;
  if (listingId && existing && existing.sellerId !== user.id && user.role !== "admin") {
    return <div className="container py-16 text-center text-muted-foreground">This listing belongs to another artist.</div>;
  }

  const addFiles = async (files: FileList) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const withPreviews = await Promise.all(
      list.map(async (file) => ({ file, preview: await fileToDataUrl(file) }))
    );
    setNewFiles((prev) => [...prev, ...withPreviews].slice(0, 6 - images.length));
  };

  const toggleRegion = (region: ShippingRegion) => {
    setShipsTo((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const save = async (asDraft: boolean) => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please add a title and description.");
      return;
    }
    if (images.length + newFiles.length === 0) {
      toast.error("Please add at least one image of the artwork.");
      return;
    }
    if (kind === "physical" && shipsTo.length === 0) {
      toast.error("Choose at least one region you ship to.");
      return;
    }
    setBusy(true);
    try {
      const uploaded = await Promise.all(newFiles.map((f) => uploadFile(f.file, "artworks")));
      const allImages = [...images, ...uploaded];
      const shippingRates = shipsTo.map((region) => ({
        region,
        rateInr: rates[region] ?? 0,
      }));
      if (listingId) {
        const updated = await updateListing(listingId, {
          title,
          description,
          category,
          medium,
          widthCm,
          heightCm,
          priceInr,
          kind,
          images: allImages,
          shipsTo,
          shippingRates,
          stock,
        });
        if (updated.pendingEdit) {
          toast.success("Edit submitted for review — your old version stays live meanwhile.");
        } else if (!asDraft && (updated.status === "draft" || updated.status === "changes_requested")) {
          await submitListingForReview(listingId);
          toast.success("Updated and resubmitted for review!");
        } else {
          toast.success("Listing updated.");
        }
      } else {
        await createListing({
          sellerId: user.id,
          title,
          description,
          category,
          medium,
          widthCm,
          heightCm,
          priceInr,
          kind,
          images: allImages,
          shipsTo,
          shippingRates,
          stock,
          asDraft,
        });
        toast.success(
          asDraft ? "Saved as draft." : "Submitted! The studio will review it shortly."
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      await queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      router.push("/sell");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the listing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="doodle-underline text-3xl font-bold">
        {listingId ? "Edit listing" : "Upload artwork"}
      </h1>
      {existing?.status === "approved" && (
        <p className="mt-4 rounded-md bg-mustard/15 p-3 text-sm">
          This listing is live. Changing its title, price, description or images sends the edit
          to review — the current version stays in the shop until the new one is approved.
        </p>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Artwork details</CardTitle>
          <CardDescription>Good photos in natural light sell best.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* images */}
          <div className="sm:col-span-2">
            <Label>Images (first = cover, up to 6)</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <span key={`old-${i}`} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Image ${i + 1}`} className="h-24 w-24 rounded-md border object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {newFiles.map((f, i) => (
                <span key={`new-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.preview} alt={`New image ${i + 1}`} className="h-24 w-24 rounded-md border-2 border-accent object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {images.length + newFiles.length < 6 && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-xs text-muted-foreground hover:border-primary">
                  <Upload className="h-5 w-5" />
                  add
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    data-testid="listing-images"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="l-title">Title</Label>
            <Input id="l-title" className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="listing-title" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="l-desc">Description</Label>
            <Textarea id="l-desc" className="mt-1 min-h-[110px]" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="listing-description" />
          </div>
          <div>
            <Label htmlFor="l-category">Category</Label>
            <Select id="l-category" className="mt-1" value={category} onChange={(e) => setCategory(e.target.value as ArtCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="l-medium">Medium</Label>
            <Select id="l-medium" className="mt-1" value={medium} onChange={(e) => setMedium(e.target.value as ArtMedium)}>
              {MEDIUMS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="l-width">Width (cm)</Label>
            <Input id="l-width" type="number" min={1} className="mt-1" value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="l-height">Height (cm)</Label>
            <Input id="l-height" type="number" min={1} className="mt-1" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="l-price">Price (INR base)</Label>
            <Input id="l-price" type="number" min={100} className="mt-1" value={priceInr} onChange={(e) => setPriceInr(Number(e.target.value))} data-testid="listing-price" />
            <p className="mt-1 text-xs text-muted-foreground">≈ {format(priceInr)} for the buyer</p>
          </div>
          <div>
            <Label htmlFor="l-kind">Type</Label>
            <Select id="l-kind" className="mt-1" value={kind} onChange={(e) => setKind(e.target.value as "physical" | "digital")}>
              <option value="physical">Physical — shipped artwork</option>
              <option value="digital">Digital — instant download</option>
            </Select>
          </div>
          {kind === "physical" && (
            <div>
              <Label htmlFor="l-stock">Stock / editions</Label>
              <Input id="l-stock" type="number" min={1} className="mt-1" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
            </div>
          )}
        </CardContent>
      </Card>

      {kind === "physical" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
            <CardDescription>Pick the regions you ship to and your rate for each (INR).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SHIPPING_REGIONS.map((region) => {
              const active = shipsTo.includes(region.value);
              return (
                <div key={region.value} className="flex items-center gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    aria-label={region.label}
                    onClick={() => toggleRegion(region.value)}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border-2",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}
                  >
                    {active && "✓"}
                  </button>
                  <span className="w-44 text-sm">{region.label}</span>
                  <Input
                    type="number"
                    min={0}
                    className="w-32"
                    aria-label={`${region.label} shipping rate`}
                    value={rates[region.value] ?? 0}
                    disabled={!active}
                    onChange={(e) =>
                      setRates((r) => ({ ...r, [region.value]: Number(e.target.value) }))
                    }
                  />
                  {active && <span className="text-xs text-muted-foreground">≈ {format(rates[region.value] ?? 0)}</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => save(false)} disabled={busy} data-testid="listing-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {listingId ? "Save changes" : "Submit for review"}
        </Button>
        {!listingId && (
          <Button size="lg" variant="outline" onClick={() => save(true)} disabled={busy}>
            Save as draft
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={() => router.push("/sell")}>Cancel</Button>
      </div>
    </div>
  );
}
