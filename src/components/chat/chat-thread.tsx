"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Brush, ImagePlus, Send } from "lucide-react";
import {
  getThread,
  listMessages,
  markThreadRead,
  sendMessage,
  subscribeMessages,
} from "@/services/messages";
import { uploadFile, uploadDataUrl } from "@/services/storage";
import { useAuth } from "@/components/auth-context";
import { SmartImage } from "@/components/smart-image";
import { SketchCanvas, type SketchCanvasHandle } from "@/components/sketch/sketch-canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage } from "@/types";
import { timeAgo, cn } from "@/lib/utils";

export function ChatThread({ threadId }: { threadId: string }) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sketchRef = useRef<SketchCanvasHandle>(null);

  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<{ file: File; preview: string } | null>(null);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: thread } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => getThread(threadId),
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => listMessages(threadId),
  });

  // realtime updates + mark read
  useEffect(() => {
    if (!userId) return;
    void markThreadRead(threadId, userId);
    const unsub = subscribeMessages(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      void markThreadRead(threadId, userId);
    });
    return unsub;
  }, [threadId, userId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="container max-w-2xl space-y-3 py-6" aria-busy="true">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-16 text-center">
        <Link href="/login" className="text-primary underline">Log in</Link> to see this conversation.
      </div>
    );
  }

  const send = async () => {
    const body = text.trim();
    const file = attachment;
    if (!body && !file) return;

    // Optimistic: clear the box and show the bubble now, confirm afterwards.
    const key = ["messages", threadId];
    const tempId = `temp_${Date.now()}`;
    setText("");
    setAttachment(null);
    await queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<ChatMessage[]>(key, (old = []) => [
      ...old,
      {
        id: tempId,
        threadId,
        senderId: user.id,
        senderName: user.name,
        text: body,
        imageUrl: file?.preview,
        createdAt: new Date().toISOString(),
      },
    ]);
    if (file) setBusy(true);
    try {
      const imageUrl = file ? await uploadFile(file.file, "chat") : undefined;
      const saved = await sendMessage({
        threadId,
        senderId: user.id,
        senderName: user.name,
        text: body,
        imageUrl,
      });
      queryClient.setQueryData<ChatMessage[]>(key, (old = []) => {
        const rest = old.filter((m) => m.id !== tempId && m.id !== saved.id);
        return [...rest, saved];
      });
    } catch (err) {
      queryClient.setQueryData<ChatMessage[]>(key, (old = []) =>
        old.filter((m) => m.id !== tempId)
      );
      setText(body);
      setAttachment(file);
      toast.error(err instanceof Error ? err.message : "Message not sent.");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const sendSketch = async () => {
    const dataUrl = sketchRef.current?.exportImage();
    if (!dataUrl) return;
    setBusy(true);
    try {
      const url = await uploadDataUrl(dataUrl, "sketches");
      await sendMessage({
        threadId,
        senderId: user.id,
        senderName: user.name,
        text: text.trim(),
        imageUrl: url,
      });
      setText("");
      setSketchOpen(false);
      queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
    } finally {
      setBusy(false);
    }
  };

  const otherId = thread?.participantIds.find((id) => id !== user.id) ?? "";

  return (
    <div className="container flex max-w-2xl flex-col py-6" style={{ minHeight: "calc(100vh - 12rem)" }}>
      <div className="flex items-center gap-3 border-b pb-3">
        <Link href="/messages" aria-label="Back to messages" className="rounded-full p-2 hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="font-display font-semibold">{thread?.participantNames[otherId] ?? "Conversation"}</p>
          <p className="text-xs text-muted-foreground">{thread?.contextLabel}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4" data-testid="chat-messages">
        {messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 shadow-cozy",
                  mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card"
                )}
              >
                {m.imageUrl && (
                  <span className="relative mb-1 block h-44 w-56 overflow-hidden rounded-lg">
                    <SmartImage src={m.imageUrl} alt="Shared image" fill className="object-cover" />
                  </span>
                )}
                {m.text && <p className="whitespace-pre-wrap text-sm">{m.text}</p>}
                <p className={cn("mt-1 text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-md border bg-card p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.preview} alt="Attachment preview" className="h-12 w-12 rounded object-cover" />
          <span className="flex-1 truncate text-xs text-muted-foreground">{attachment.file.name}</span>
          <Button variant="ghost" size="sm" onClick={() => setAttachment(null)}>remove</Button>
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="cursor-pointer rounded-full p-2 hover:bg-muted" title="Attach image">
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const { fileToDataUrl } = await import("@/lib/utils");
              setAttachment({ file, preview: await fileToDataUrl(file) });
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setSketchOpen(true)}
          title="Send a sketch"
          aria-label="Send a sketch"
          className="rounded-full p-2 hover:bg-muted"
          data-testid="chat-sketch"
        >
          <Brush className="h-5 w-5 text-muted-foreground" />
        </button>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Write a message…"
          aria-label="Message"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="chat-input"
        />
        <Button type="submit" size="icon" disabled={busy || (!text.trim() && !attachment)} aria-label="Send" data-testid="chat-send">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* sketch dialog */}
      <Dialog open={sketchOpen} onOpenChange={setSketchOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sketch something</DialogTitle>
          </DialogHeader>
          <SketchCanvas ref={sketchRef} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSketchOpen(false)}>Cancel</Button>
            <Button onClick={sendSketch} disabled={busy}>
              <Send className="h-4 w-4" /> Send sketch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
