"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    icon: "😊",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 😌 😔 😪 😴 😷 🤒 🤕 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😢 😭 😱 😤 😡 🤯 😈 💀 🤡 👻".split(" "),
  },
  {
    label: "Hands",
    icon: "👍",
    emojis: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 👋 🤝 🙏 👏 🙌 🫶 💪 ✍️ 🤳 💅 👀 🧠 🫡 🤷 🤦 🙋 🙆 🙅 💁 🧑‍🎨".split(" "),
  },
  {
    label: "Hearts",
    icon: "❤️",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ ⭐ 🌟 💫 🔥 💯 🎉 🎊 🎁 🏆 🥇 ✅ ❌ ❓ ❗ 💬 💭".split(" "),
  },
  {
    label: "Art",
    icon: "🎨",
    emojis: "🎨 🖌️ 🖍️ ✏️ 🖊️ 🖋️ 📐 📏 🖼️ 🧵 🪡 🧶 📷 📸 🎞️ 🎭 🎬 🎼 🎵 🎶 🪔 🏺 🧱 📦 🚚 ✉️ 📮 💰 💳 🧾 📅 ⏰ ⏳ 📍 🔍 🔒".split(" "),
  },
  {
    label: "Nature",
    icon: "🌸",
    emojis: "🌸 🌺 🌻 🌷 🌹 🪷 🌼 🌿 🍃 🍂 🍁 🌳 🌴 🌵 🌈 ☀️ 🌤️ ⛅ 🌧️ ⛈️ ❄️ 🌙 🌊 🏔️ 🦋 🐦 🦚 🐘 🐅 🐈 🐕 🍵 ☕ 🍰 🍕 🍎".split(" "),
  },
];

/** Compact emoji panel. Sits in the page flow, so it can never overflow the screen. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [group, setGroup] = useState(0);

  return (
    <div className="rounded-lg border bg-card" data-testid="emoji-picker">
      <div className="flex gap-1 border-b p-1" role="tablist" aria-label="Emoji groups">
        {GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            aria-selected={i === group}
            aria-label={g.label}
            title={g.label}
            // keep the keyboard open and the caret where it is
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setGroup(i)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center rounded-md text-lg transition-colors hover:bg-muted",
              i === group && "bg-muted"
            )}
          >
            {g.icon}
          </button>
        ))}
      </div>
      <div
        className="grid max-h-40 grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] overflow-y-auto overscroll-contain p-1"
        role="tabpanel"
        aria-label={GROUPS[group].label}
      >
        {GROUPS[group].emojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            onPointerDown={(ev) => ev.preventDefault()}
            onClick={() => onPick(e)}
            className="flex h-9 items-center justify-center rounded-md text-xl hover:bg-muted"
            aria-label={`Insert ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
