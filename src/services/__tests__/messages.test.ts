import { beforeEach, describe, expect, it } from "vitest";
import { __resetForTests } from "@/lib/local/db";
import * as messages from "@/services/messages/local";
import { DEMO_IDS } from "@/lib/demo-data";

beforeEach(() => {
  __resetForTests();
});

async function newThread() {
  return messages.getOrCreateThread({
    userId: DEMO_IDS.buyer,
    userName: "Maya Kapoor",
    otherUserId: DEMO_IDS.seller,
    otherUserName: "Arjun Mehta",
    context: { type: "general", id: "test" },
    contextLabel: "Test chat",
  });
}

describe("messages", () => {
  it("sends a message and marks it unread for the other participant", async () => {
    const thread = await newThread();
    await messages.send({
      threadId: thread.id,
      senderId: DEMO_IDS.buyer,
      senderName: "Maya Kapoor",
      text: "hello",
    });
    const list = await messages.listMessages(thread.id);
    expect(list.map((m) => m.text)).toEqual(["hello"]);
    const updated = await messages.getThread(thread.id);
    expect(updated?.unreadBy).toEqual([DEMO_IDS.seller]);
  });

  it("keeps the reply link and one reaction per person", async () => {
    const thread = await newThread();
    const first = await messages.send({
      threadId: thread.id,
      senderId: DEMO_IDS.buyer,
      senderName: "Maya Kapoor",
      text: "which size?",
    });
    const reply = await messages.send({
      threadId: thread.id,
      senderId: DEMO_IDS.seller,
      senderName: "Arjun Mehta",
      text: "A3",
      replyToId: first.id,
    });
    expect(reply.replyToId).toBe(first.id);

    await messages.react(first.id, DEMO_IDS.seller, "👍");
    await messages.react(first.id, DEMO_IDS.seller, "❤️"); // replaces, not adds
    await messages.react(first.id, DEMO_IDS.buyer, "😂");
    let list = await messages.listMessages(thread.id);
    expect(list[0].reactions).toEqual({ [DEMO_IDS.seller]: "❤️", [DEMO_IDS.buyer]: "😂" });

    await messages.react(first.id, DEMO_IDS.seller, null);
    list = await messages.listMessages(thread.id);
    expect(list[0].reactions).toEqual({ [DEMO_IDS.buyer]: "😂" });
  });

  it("an open chat that marks-read on every change does not loop", async () => {
    const thread = await newThread();
    let calls = 0;
    // mirrors the chat screen: every change re-marks the thread as read
    const unsubscribe = messages.subscribeMessages(() => {
      calls++;
      if (calls > 50) throw new Error("subscription loop");
      void messages.markThreadRead(thread.id, DEMO_IDS.seller);
    });
    await messages.send({
      threadId: thread.id,
      senderId: DEMO_IDS.buyer,
      senderName: "Maya Kapoor",
      text: "are you there?",
    });
    unsubscribe();
    expect(calls).toBeLessThan(10);
    expect((await messages.getThread(thread.id))?.unreadBy).toEqual([]);
    expect((await messages.listMessages(thread.id)).length).toBe(1);
  });
});
