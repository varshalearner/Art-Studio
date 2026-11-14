"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Brush,
  CalendarDays,
  ImagePlus,
  IndianRupee,
  Loader2,
  MessageSquareText,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { ArtMedium } from "@/types";
import { listArtists } from "@/services/artworks";
import { createCommission } from "@/services/commissions";
import { uploadFile, uploadDataUrl } from "@/services/storage";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { SketchCanvas, type SketchCanvasHandle } from "@/components/sketch/sketch-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config";
import { fileToDataUrl, cn } from "@/lib/utils";

const MEDIUMS: ArtMedium[] = ["oil", "acrylic", "watercolor", "pencil", "charcoal", "ink", "digital", "mixed_media"];

export function CommissionForm() {
  const t = useTranslations("commission");
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const sketchRef = useRef<SketchCanvasHandle>(null);

  const { data: artists = [] } = useQuery({ queryKey: ["artists"], queryFn: listArtists });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medium, setMedium] = useState<ArtMedium>("oil");
  const [size, setSize] = useState("50 × 70 cm");
  const [style, setStyle] = useState("");
  const [budgetMin, setBudgetMin] = useState(5000);
  const [budgetMax, setBudgetMax] = useState(20000);
  const [deadline, setDeadline] = useState("");
  const [artistId, setArtistId] = useState<string>(params.get("artist") ?? "");
  const [refFiles, setRefFiles] = useState<{ file: File; preview: string }[]>([]);
  const [showSketch, setShowSketch] = useState(false);
  const [sketchBg, setSketchBg] = useState<string | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const withPreviews = await Promise.all(
      list.map(async (file) => ({ file, preview: await fileToDataUrl(file) }))
    );
    setRefFiles((prev) => [...prev, ...withPreviews].slice(0, 6));
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await addFiles(e.dataTransfer.files);
  };

  const submit = async () => {
    if (!user) {
      toast.info("Please log in to send a commission request.");
      router.push("/login?next=/commission");
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error("Please give your idea a title and a description.");
      return;
    }
    if (budgetMin > budgetMax) {
      toast.error("The minimum budget is higher than the maximum.");
      return;
    }
    setBusy(true);
    try {
      const referenceImages = await Promise.all(
        refFiles.map((r) => uploadFile(r.file, "references"))
      );
      let sketchImage: string | undefined;
      const sketch = sketchRef.current;
      if (showSketch && sketch?.hasContent()) {
        const dataUrl = sketch.exportImage();
        if (dataUrl) sketchImage = await uploadDataUrl(dataUrl, "sketches");
      }
      const commission = await createCommission({
        buyerId: user.id,
        artistId: artistId || null,
        title,
        description,
        medium,
        size,
        style,
        budgetMinInr: budgetMin,
        budgetMaxInr: budgetMax,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        referenceImages,
        sketchImage,
      });
      toast.success("Commission request sent! 🎨");
      router.push(`/account/commissions/${commission.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="doodle-underline text-3xl font-bold md:text-4xl">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-10 space-y-6">
        {/* ---------- a) reference photos ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" /> 1 · Reference photos
            </CardTitle>
            <CardDescription>
              Drag & drop up to 6 photos — places, people, pets, moods. Optional but very helpful.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"
              )}
              data-testid="reference-dropzone"
            >
              <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">Drop photos here, or click to choose</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, up to 8 MB each</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                data-testid="reference-input"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </label>
            {refFiles.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-3" data-testid="reference-previews">
                {refFiles.map((r, i) => (
                  <li key={i} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.preview}
                      alt={`Reference ${i + 1}`}
                      className="h-24 w-24 rounded-md border object-cover shadow-cozy"
                    />
                    <button
                      type="button"
                      aria-label={`Remove reference ${i + 1}`}
                      onClick={() => setRefFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="absolute inset-x-0 bottom-0 hidden rounded-b-md bg-charcoal/70 py-0.5 text-[10px] font-semibold text-white group-hover:block"
                      onClick={() => {
                        setSketchBg(r.preview);
                        setShowSketch(true);
                        toast.info("Photo set as the sketch background — draw on top!");
                      }}
                    >
                      draw on this
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ---------- b) describe it ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" /> 2 · Describe it
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="c-title">Title for your idea</Label>
              <Input
                id="c-title"
                className="mt-1"
                placeholder="e.g. Our family home in the hills"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="commission-title"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                className="mt-1 min-h-[120px]"
                placeholder="Tell the artist about the scene, the mood, the colours, the people…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="commission-description"
              />
            </div>
            <div>
              <Label htmlFor="c-medium">Medium</Label>
              <Select id="c-medium" className="mt-1" value={medium} onChange={(e) => setMedium(e.target.value as ArtMedium)}>
                {MEDIUMS.map((m) => (
                  <option key={m} value={m}>{m.replace("_", " ")}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="c-size">Size</Label>
              <Input id="c-size" className="mt-1" value={size} onChange={(e) => setSize(e.target.value)} placeholder="50 × 70 cm" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="c-style">Style notes (optional)</Label>
              <Input id="c-style" className="mt-1" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="loose & impressionistic, bold colours…" />
            </div>
            <div>
              <Label htmlFor="c-budget-min" className="flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" /> Budget range (INR base)
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="c-budget-min"
                  type="number"
                  min={500}
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(Number(e.target.value))}
                  aria-label="Budget minimum"
                />
                <span aria-hidden>–</span>
                <Input
                  type="number"
                  min={500}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  aria-label="Budget maximum"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {format(budgetMin)} – {format(budgetMax)}
              </p>
            </div>
            <div>
              <Label htmlFor="c-deadline" className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Deadline (optional)
              </Label>
              <Input
                id="c-deadline"
                type="date"
                className="mt-1"
                value={deadline}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ---------- c) sketch it ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brush className="h-5 w-5 text-primary" /> 3 · Sketch it (optional)
            </CardTitle>
            <CardDescription>
              Doodle the composition — stick figures welcome. You can draw on top of one of your photos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showSketch ? (
              <SketchCanvas ref={sketchRef} initialBackground={sketchBg} />
            ) : (
              <Button variant="outline" onClick={() => setShowSketch(true)} data-testid="open-sketch">
                <Brush className="h-4 w-4" /> Open the sketch canvas
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ---------- d) pick an artist ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> 4 · Who should paint it?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              aria-label="Choose an artist"
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              data-testid="artist-select"
            >
              <option value="">✨ Let the studio choose for me</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} — {a.country}{a.verified ? " ✓" : ""}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              After the artist sends a quote you pay a {siteConfig.commissionDepositPercent}% deposit,
              and the rest only when the piece is ready.
            </p>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={submit} disabled={busy} data-testid="commission-submit">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brush className="h-4 w-4" />}
          Send commission request
        </Button>
      </div>
    </div>
  );
}
