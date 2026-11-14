"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Reply, SmilePlus } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import type { ChatMessage } from "@/types";
import { cn, timeAgo } from "@/lib/utils";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const SWIPE_TRIGGER = 56; // px dragged before a swipe counts as "reply"
const SWIPE_MAX = 76;
const LONG_PRESS_MS = 450;

interface Props {
  message: ChatMessage;
  mine: boolean;
  myId: string;
  /** the message this one quotes, when it is a reply */
  quoted?: ChatMessage | null;
  quotedName?: string;
  highlighted?: boolean;
  /** still being sent: no reply / react yet */
  pending?: boolean;
  onReply: () => void;
  onReact: (emoji: string | null) => void;
  onOpenImage: () => void;
  onJumpToQuoted: () => void;
}

/**
 * One chat bubble.
 * Touch: swipe right to reply, long-press for reactions.
 * Mouse: hover shows react / reply buttons.
 */
export function MessageBubble({
  message: m,
  mine,
  myId,
  quoted,
  quotedName,
  highlighted,
  pending,
  onReply,
  onReact,
  onOpenImage,
  onJumpToQuoted,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; mode: "idle" | "swipe" | "scroll" } | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const dragged = useRef(0); // latest swipe distance, readable without a re-render
  const [offset, setOffset] = useState(0);
  const [menu, setMenu] = useState<null | "above" | "below">(null);

  const myReaction = m.reactions?.[myId];
  const counts = new Map<string, number>();
  for (const emoji of Object.values(m.reactions ?? {})) {
    counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  }

  const openMenu = () => {
    if (pending) return;
    // not enough room above the first bubbles: open downwards instead
    const row = rowRef.current;
    const scroller = row?.closest("[data-chat-scroller]");
    const room =
      row && scroller
        ? row.getBoundingClientRect().top - scroller.getBoundingClientRect().top
        : 999;
    setMenu(room < 110 ? "below" : "above");
  };

  const clearLongPress = () => {
    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (pending || e.touches.length !== 1) return;
    suppressClick.current = false;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, mode: "idle" };
    clearLongPress();
    longPress.current = setTimeout(() => {
      suppressClick.current = true;
      touch.current = null;
      navigator.vibrate?.(12);
      openMenu();
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = touch.current;
    if (!t) return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (t.mode === "idle") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      clearLongPress();
      t.mode = dx > 0 && Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
    }
    if (t.mode === "swipe") {
      suppressClick.current = true;
      dragged.current = Math.max(0, Math.min(SWIPE_MAX, dx));
      setOffset(dragged.current);
    }
  };

  const onTouchEnd = () => {
    clearLongPress();
    if (touch.current?.mode === "swipe" && dragged.current >= SWIPE_TRIGGER) {
      navigator.vibrate?.(8);
      onReply();
    }
    touch.current = null;
    dragged.current = 0;
    setOffset(0);
  };

  const react = (emoji: string) => {
    setMenu(null);
    onReact(myReaction === emoji ? null : emoji);
  };

  const copy = async () => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(m.text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const hoverActions = !pending && (
    <div className="hidden shrink-0 items-center gap-0.5 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:flex">
      <button
        type="button"
        onClick={openMenu}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="React to message"
        title="React"
      >
        <SmilePlus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReply}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Reply to message"
        title="Reply"
      >
        <Reply className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div
      ref={rowRef}
      id={`msg-${m.id}`}
      data-testid="chat-message"
      className={cn(
        "group relative flex items-end gap-1 rounded-lg transition-colors duration-700",
        mine ? "justify-end" : "justify-start",
        highlighted && "bg-accent/25"
      )}
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onContextMenu={(e) => {
        // long-press on touch screens opens our menu, not the browser's
        if (suppressClick.current) e.preventDefault();
      }}
    >
      {/* reply hint that fades in while swiping */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1.5 text-muted-foreground"
        style={{ opacity: Math.min(1, offset / SWIPE_TRIGGER), transform: `scale(${0.6 + 0.4 * Math.min(1, offset / SWIPE_TRIGGER)})` }}
      >
        <Reply className="h-4 w-4" />
      </span>

      {menu && <div className="fixed inset-0 z-20" onPointerDown={() => setMenu(null)} aria-hidden />}

      {mine && hoverActions}

      <div
        className="relative min-w-0 max-w-[82%] sm:max-w-[75%]"
        style={{ left: offset, transition: offset ? "none" : "left 0.18s ease-out" }}
      >
        <div
          className={cn(
            "rounded-2xl px-3 py-2 shadow-cozy [@media(pointer:coarse)]:select-none",
            mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card",
            pending && "opacity-70"
          )}
          style={{ WebkitTouchCallout: "none" }}
        >
          {quoted !== undefined && (
            <button
              type="button"
              onClick={onJumpToQuoted}
              className={cn(
                "mb-1 block w-full rounded-lg border-l-4 px-2 py-1 text-left text-xs",
                mine
                  ? "border-primary-foreground/60 bg-primary-foreground/15"
                  : "border-primary bg-muted"
              )}
            >
              <span className="block font-semibold">{quoted ? quotedName : "Message"}</span>
              <span className="line-clamp-2 break-words opacity-90">
                {quoted ? quoted.text || "📷 Photo" : "Original message not available"}
              </span>
            </button>
          )}
          {m.imageUrl && (
            <button
              type="button"
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onOpenImage();
              }}
              className="relative mb-1 block h-44 w-56 max-w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open photo"
              data-testid="chat-image"
            >
              <SmartImage src={m.imageUrl} alt="Shared image" fill className="object-cover" />
            </button>
          )}
          {m.text && <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>}
          <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {pending ? "sending…" : timeAgo(m.createdAt)}
          </p>
        </div>

        {counts.size > 0 && (
          <div className={cn("-mt-1.5 flex flex-wrap gap-1 px-1", mine ? "justify-end" : "justify-start")}>
            {[...counts.entries()].map(([emoji, n]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                aria-label={`${emoji} ${n}${myReaction === emoji ? ", tap to remove yours" : ""}`}
                aria-pressed={myReaction === emoji}
                data-testid="chat-reaction"
                className={cn(
                  "relative flex items-center gap-0.5 rounded-full border bg-card px-1.5 py-0.5 text-sm leading-none text-foreground shadow-sm",
                  myReaction === emoji && "border-primary bg-primary/10"
                )}
              >
                <span>{emoji}</span>
                {n > 1 && <span className="text-[11px] font-semibold">{n}</span>}
              </button>
            ))}
          </div>
        )}

        {menu && (
          <div
            role="menu"
            aria-label="Message actions"
            data-testid="chat-menu"
            className={cn(
              "absolute z-30 flex flex-col gap-1",
              mine ? "right-0 items-end" : "left-0 items-start",
              menu === "above" ? "bottom-full mb-1" : "top-full mt-1"
            )}
          >
            <div className="flex gap-0.5 rounded-full border bg-card p-1 shadow-lg">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  role="menuitem"
                  onClick={() => react(emoji)}
                  aria-label={`React ${emoji}`}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-muted",
                    myReaction === emoji && "bg-primary/15"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 rounded-full border bg-card p-1 text-sm text-foreground shadow-lg">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  onReply();
                }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-muted"
              >
                <Reply className="h-4 w-4" /> Reply
              </button>
              {m.text && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-muted"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {!mine && hoverActions}
    </div>
  );
}
