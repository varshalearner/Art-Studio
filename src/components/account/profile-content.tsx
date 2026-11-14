"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Check, CheckCircle2, Loader2 } from "lucide-react";
import { updateProfile } from "@/services/auth";
import { uploadFile } from "@/services/storage";
import { useAuth } from "@/components/auth-context";
import { AccountShell } from "@/components/account/account-shell";
import { Avatar, PRESET_AVATARS } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, fileToDataUrl, squareImage } from "@/lib/utils";

export function ProfileContent() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // shown immediately while the real save is still in flight
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  if (!user) return <AccountShell>{null}</AccountShell>;

  const avatar = pendingAvatar ?? user.avatarUrl;

  const saveAvatar = async (preview: string, getUrl: () => Promise<string>) => {
    setPendingAvatar(preview);
    setAvatarBusy(true);
    try {
      await updateProfile(user.id, { avatarUrl: await getUrl() });
      await refresh();
      // artist cards and pages show this picture too
      void queryClient.invalidateQueries({ queryKey: ["artists"] });
      void queryClient.invalidateQueries({ queryKey: ["artist"] });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the photo.");
    } finally {
      setPendingAvatar(null);
      setAvatarBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    try {
      const small = await squareImage(file);
      await saveAvatar(await fileToDataUrl(small), () => uploadFile(small, "avatars"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that image.");
    }
  };

  const save = async () => {
    const next = (name ?? user.name).trim();
    if (!next) {
      toast.error("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, { name: next });
      await refresh();
      setName(null);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountShell title="Profile">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-3">
            {user.name}
            {user.role === "admin" && <Badge variant="terracotta">admin</Badge>}
            {user.isSeller && user.sellerProfile?.verified && (
              <Badge variant="sage"><CheckCircle2 className="h-3 w-3" /> verified artist</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* profile photo: upload your own or pick a ready-made avatar */}
          <div>
            <Label>Profile photo</Label>
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Upload a profile photo"
                data-testid="avatar-upload"
              >
                <Avatar
                  src={avatar}
                  name={user.name}
                  className="h-20 w-20 border-2 border-accent/40 text-2xl"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="h-5 w-5" aria-hidden />
                </span>
                {avatarBusy && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  </span>
                )}
              </button>
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarBusy}
                  >
                    <Camera className="h-4 w-4" /> Upload photo
                  </Button>
                  {user.avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={avatarBusy}
                      onClick={() => saveAvatar("", async () => "")}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or WebP. It is cropped to a square.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                data-testid="avatar-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void onFile(file);
                }}
              />
            </div>

            <p className="mb-2 mt-4 text-xs text-muted-foreground">Or pick an avatar</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Ready-made avatars">
              {PRESET_AVATARS.map((src, i) => {
                const selected = avatar === src;
                return (
                  <button
                    key={src}
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => !selected && saveAvatar(src, async () => src)}
                    aria-label={`Avatar ${i + 1}`}
                    aria-pressed={selected}
                    data-testid={`avatar-preset-${i + 1}`}
                    className={cn(
                      "relative rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-primary" : "border-transparent hover:border-accent"
                    )}
                  >
                    <Avatar src={src} className="h-11 w-11" />
                    {selected && (
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                        <Check className="h-3 w-3" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="p-name">Display name</Label>
            <Input
              id="p-name"
              className="mt-1"
              value={name ?? user.name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" className="mt-1" value={user.email} disabled />
          </div>
          <Button onClick={save} disabled={saving}>Save changes</Button>
        </CardContent>
      </Card>
    </AccountShell>
  );
}
