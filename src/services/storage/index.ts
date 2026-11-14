// Storage service: demo keeps data-URLs in localStorage; live uploads to
// Supabase Storage buckets and returns public URLs.
import { isSupabaseLive } from "@/config";
import { fileToDataUrl, uid } from "@/lib/utils";

export type StorageFolder = "artworks" | "references" | "sketches" | "chat" | "avatars" | "wip";

async function uploadToSupabase(blob: Blob, folder: StorageFolder, ext: string): Promise<string> {
  const { getSupabase } = await import("@/lib/supabase/client");
  const path = `${folder}/${uid()}.${ext}`;
  const { error } = await getSupabase()
    .storage.from("artworks")
    .upload(path, blob, { upsert: false });
  if (error) throw error;
  const { data } = getSupabase().storage.from("artworks").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a File; resolves to a URL usable in <img src>. */
export async function uploadFile(file: File, folder: StorageFolder): Promise<string> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image too large — please keep files under 8 MB.");
  }
  if (!isSupabaseLive) {
    return fileToDataUrl(file); // demo: data-URL straight into local db
  }
  const ext = file.name.split(".").pop() || "png";
  return uploadToSupabase(file, folder, ext);
}

/** Upload a data-URL (e.g. the sketch canvas export). */
export async function uploadDataUrl(dataUrl: string, folder: StorageFolder): Promise<string> {
  if (!isSupabaseLive) return dataUrl;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return uploadToSupabase(blob, folder, "png");
}
