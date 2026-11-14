"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Brush, ImagePlus, Send, Smile, X } from "lucide-react";
import {
  getThread,
  listMessages,
  markThreadRead,
  reactToMessage,
  sendMessage,
  subscribeMessages,
} from "@/services/messages";
import { uploadFile, uploadDataUrl } from "@/services/storage";
import { useAuth } from "@/components/auth-context";
import { Avatar } from "@/components/avatar";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { ImageLightbox } from "@/components/chat/image-lightbox";
import { MessageBubble } from "@/components/chat/message-bubble";
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
import { cn, fileToDataUrl } from "@/lib/utils";

/**
 * Chat panel sizing.
 * Phones: a fixed full-screen panel that follows the *visual* viewport, so
 * when the keyboard opens the header stays on top, the input sits right on
 * the keyboard and the messages remain visible in between (like WhatsApp).
 * Tablets/desktop: a normal panel under the site navbar.
 */
const PANEL =
  "flex flex-col bg-background " +
  "max-md:fixed max-md:inset-x-0 max-md:top-[var(--vv-top,0px)] max-md:z-[45] max-md:h-[var(--vv-h,100dvh)] " +
  "md:container md:h-[calc(100dvh-4rem)] md:max-w-2xl md:py-4";

/** Publishes the visible viewport (minus on-screen keyboard) as CSS variables. */
function useKeyboardAwareViewport(onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const phone = window.matchMedia("(max-width: 767px)");

    const apply = () => {
      if (vv) {
        root.style.setProperty("--vv-h", `${vv.height}px`);
        root.style.setProperty("--vv-top", `${vv.offsetTop}px`);
      }
      onChangeRef.current();
    };
    // the page behind the full-screen panel must not scroll on phones
    const lock = () => {
      document.body.style.overflow = phone.matches ? "hidden" : "";
    };

    apply();
    lock();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    phone.addEventListener("change", lock);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      phone.removeEventListener("change", lock);
      document.body.style.overflow = "";
      root.style.removeProperty("--vv-h");
      root.style.removeProperty("--vv-top");
    };
  }, []);
}

export function ChatThread({ threadId }: { threadId: string }) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sketchRef = useRef<SketchCanvasHandle>(null);
  const nearBottom = useRef(true);

  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<{ file: File; preview: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sketchOpen, setSketchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const messagesKey = useMemo(() => ["messages", threadId], [threadId]);

  const { data: thread } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => getThread(threadId),
  });
  const { data: messages = [] } = useQuery({
    queryKey: messagesKey,
    queryFn: () => listMessages(threadId),
  });

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // keyboard opened / closed: keep the latest messages in view
  useKeyboardAwareViewport(() => {
    if (nearBottom.current) requestAnimationFrame(() => scrollToBottom());
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

  // new message: follow the conversation unless the reader scrolled up
  const lastId = messages[messages.length - 1]?.id;
  const lastMine = messages[messages.length - 1]?.senderId === userId;
  const firstPaint = useRef(true);
  useLayoutEffect(() => {
    if (!lastId) return;
    if (firstPaint.current || nearBottom.current || lastMine) {
      scrollToBottom(!firstPaint.current);
    }
    firstPaint.current = false;
  }, [lastId, lastMine, scrollToBottom]);

  // composer grew/shrank (emoji panel, reply bar, attachment): stay at the bottom
  useLayoutEffect(() => {
    if (nearBottom.current) scrollToBottom();
  }, [emojiOpen, replyTo, attachment, scrollToBottom]);

  // grow the input with its content, up to ~5 lines
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [text]);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const images = useMemo(
    () => messages.filter((m) => m.imageUrl).map((m) => ({ id: m.id, url: m.imageUrl! })),
    [messages]
  );

  if (loading) {
    return (
      <div className={cn(PANEL, "gap-3 p-4")} aria-busy="true">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="min-h-0 w-full flex-1 rounded-lg" />
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

  const otherId = thread?.participantIds.find((id) => id !== user.id) ?? "";
  const otherName = thread?.participantNames[otherId] ?? "Conversation";
  const nameOf = (m: ChatMessage) => (m.senderId === user.id ? "You" : m.senderName || otherName);

  const send = async () => {
    const body = text.trim();
    const file = attachment;
    const reply = replyTo;
    if (!body && !file) return;

    // Optimistic: clear the box and show the bubble now, confirm afterwards.
    const tempId = `temp_${Date.now()}`;
    setText("");
    setAttachment(null);
    setReplyTo(null);
    setEmojiOpen(false);
    nearBottom.current = true;
    await queryClient.cancelQueries({ queryKey: messagesKey });
    queryClient.setQueryData<ChatMessage[]>(messagesKey, (old = []) => [
      ...old,
      {
        id: tempId,
        threadId,
        senderId: user.id,
        senderName: user.name,
        text: body,
        imageUrl: file?.preview,
        replyToId: reply?.id,
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
        replyToId: reply?.id,
      });
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old = []) => {
        const rest = old.filter((m) => m.id !== tempId && m.id !== saved.id);
        return [...rest, saved];
      });
    } catch (err) {
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old = []) =>
        old.filter((m) => m.id !== tempId)
      );
      setText(body);
      setAttachment(file);
      setReplyTo(reply);
      toast.error(err instanceof Error ? err.message : "Message not sent.");
    } finally {
      setBusy(false);
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
        replyToId: replyTo?.id,
      });
      setText("");
      setReplyTo(null);
      setSketchOpen(false);
      nearBottom.current = true;
      queryClient.invalidateQueries({ queryKey: messagesKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sketch not sent.");
    } finally {
      setBusy(false);
    }
  };

  const react = async (message: ChatMessage, emoji: string | null) => {
    const patch = (value: string | null) =>
      queryClient.setQueryData<ChatMessage[]>(messagesKey, (old = []) =>
        old.map((m) => {
          if (m.id !== message.id) return m;
          const reactions = { ...(m.reactions ?? {}) };
          if (value) reactions[user.id] = value;
          else delete reactions[user.id];
          return { ...m, reactions };
        })
      );
    const before = message.reactions?.[user.id] ?? null;
    await queryClient.cancelQueries({ queryKey: messagesKey });
    patch(emoji); // show it immediately
    try {
      await reactToMessage(message.id, user.id, emoji);
    } catch (err) {
      patch(before);
      toast.error(err instanceof Error ? err.message : "Could not react.");
    }
  };

  const startReply = (m: ChatMessage) => {
    setReplyTo(m);
    inputRef.current?.focus();
  };

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1400);
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    // put the caret right after the emoji
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const canSend = !busy && (!!text.trim() || !!attachment);
  const iconButton =
    "flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className={PANEL} data-testid="chat-panel">
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 border-b bg-background px-2 py-2 md:px-0 md:pb-3">
        <Link href="/messages" aria-label="Back to messages" className="rounded-full p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={otherName} className="h-9 w-9 text-sm" />
        <div className="min-w-0">
          <p className="truncate font-display font-semibold leading-tight">{otherName}</p>
          <p className="truncate text-xs text-muted-foreground">{thread?.contextLabel}</p>
        </div>
      </div>

      {/* messages */}
      <div
        ref={scrollerRef}
        data-chat-scroller
        data-testid="chat-messages"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 md:px-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Say hello 👋</p>
        )}
        {messages.map((m) => {
          const quoted = m.replyToId ? byId.get(m.replyToId) ?? null : undefined;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.senderId === user.id}
              myId={user.id}
              quoted={quoted}
              quotedName={quoted ? nameOf(quoted) : undefined}
              highlighted={highlightId === m.id}
              pending={m.id.startsWith("temp_")}
              onReply={() => startReply(m)}
              onReact={(emoji) => void react(m, emoji)}
              onOpenImage={() => setLightbox(images.findIndex((i) => i.id === m.id))}
              onJumpToQuoted={() => m.replyToId && jumpTo(m.replyToId)}
            />
          );
        })}
      </div>

      {/* composer */}
      <div className="shrink-0 space-y-2 border-t bg-background px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:px-0">
        {replyTo && (
          <div className="flex items-center gap-2 rounded-lg border-l-4 border-primary bg-muted px-3 py-1.5" data-testid="chat-reply-preview">
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-semibold text-primary">Replying to {nameOf(replyTo)}</p>
              <p className="truncate text-muted-foreground">{replyTo.text || "📷 Photo"}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded-full p-1.5 hover:bg-background"
              aria-label="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {attachment && (
          <div className="flex items-center gap-2 rounded-md border bg-card p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachment.preview} alt="Attachment preview" className="h-12 w-12 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{attachment.file.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setAttachment(null)}>remove</Button>
          </div>
        )}

        {emojiOpen && <EmojiPicker onPick={insertEmoji} />}

        <form
          className="flex items-end gap-0.5"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <button
            type="button"
            // preventDefault keeps focus (and the keyboard) on the input
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setEmojiOpen((o) => !o)}
            className={cn(iconButton, emojiOpen && "bg-muted text-foreground")}
            aria-label="Emoji"
            aria-expanded={emojiOpen}
            title="Emoji"
            data-testid="chat-emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <label className={cn(iconButton, "cursor-pointer")} title="Attach image">
            <ImagePlus className="h-5 w-5" />
            <span className="sr-only">Attach image</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setAttachment({ file, preview: await fileToDataUrl(file) });
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setSketchOpen(true)}
            title="Send a sketch"
            aria-label="Send a sketch"
            className={iconButton}
            data-testid="chat-sketch"
          >
            <Brush className="h-5 w-5" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends with a real keyboard; on phones it adds a new line
              const touchKeyboard = window.matchMedia("(pointer: coarse)").matches;
              if (e.key === "Enter" && !e.shiftKey && !touchKeyboard && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Message"
            aria-label="Message"
            rows={1}
            enterKeyHint="enter"
            // 16px on phones: anything smaller makes iOS zoom the page on focus
            className="mx-1 max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-input bg-card px-3.5 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            data-testid="chat-input"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            disabled={!canSend}
            onPointerDown={(e) => e.preventDefault()}
            aria-label="Send"
            data-testid="chat-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {lightbox !== null && lightbox >= 0 && (
        <ImageLightbox
          images={images.map((i) => i.url)}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}

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
