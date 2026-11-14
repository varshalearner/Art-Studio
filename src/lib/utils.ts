import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = ""): string {
  const core =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${core}` : core;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "artwork"
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Format an ISO date in the viewer's local time zone. */
export function formatDate(iso: string, locale = "en", withTime = false): string {
  try {
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function sizeLabel(widthCm: number, heightCm: number): string {
  return `${widthCm} × ${heightCm} cm`;
}

/** small / medium / large buckets used by the shop size filter */
export function sizeBucket(widthCm: number, heightCm: number): "small" | "medium" | "large" {
  const area = widthCm * heightCm;
  if (area <= 900) return "small"; // up to ~30x30
  if (area <= 3600) return "medium"; // up to ~60x60
  return "large";
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Centre-crops an image to a square and shrinks it, so a profile photo is a
 * few KB instead of a multi-MB camera file.
 */
export async function squareImage(file: File, size = 400): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file is not an image we can read."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob) throw new Error("Could not process the image.");
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Simple client-side rate limiter: returns true when the action is allowed. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(`rl_${key}`);
    const now = Date.now();
    let stamps: number[] = raw ? JSON.parse(raw) : [];
    stamps = stamps.filter((t) => now - t < windowMs);
    if (stamps.length >= max) return false;
    stamps.push(now);
    window.localStorage.setItem(`rl_${key}`, JSON.stringify(stamps));
    return true;
  } catch {
    return true;
  }
}
