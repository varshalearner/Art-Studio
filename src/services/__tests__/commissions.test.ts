import { beforeEach, describe, expect, it } from "vitest";
import { __resetForTests } from "@/lib/local/db";
import * as commissions from "@/services/commissions/local";
import { DEMO_IDS } from "@/lib/demo-data";

beforeEach(() => {
  __resetForTests();
});

function input(): commissions.NewCommissionInput {
  return {
    buyerId: DEMO_IDS.buyer,
    artistId: DEMO_IDS.seller,
    title: "Sunset over the ghats",
    description: "Evening light on the river steps.",
    medium: "oil",
    size: "50 × 70 cm",
    style: "impressionistic",
    budgetMinInr: 10000,
    budgetMaxInr: 20000,
    referenceImages: ["/art/art-02.svg"],
    sketchImage: "data:image/png;base64,TEST",
  };
}

describe("commission flow", () => {
  it("walks the full happy path with correct money math", async () => {
    const c = await commissions.create(input());
    expect(c.status).toBe("submitted");
    expect(c.sketchImage).toBeTruthy();

    const quoted = await commissions.sendQuote(c.id, 16000, "Happy to paint this!");
    expect(quoted.status).toBe("quote_sent");
    expect(quoted.quoteInr).toBe(16000);

    const accepted = await commissions.accept(c.id);
    expect(accepted.status).toBe("accepted");

    const deposited = await commissions.payDeposit(c.id, "pay_dep_1");
    expect(deposited.status).toBe("deposit_paid");
    // default deposit is 40%
    expect(deposited.depositPaidInr).toBe(Math.round(16000 * 0.4));

    const started = await commissions.startWork(c.id);
    expect(started.status).toBe("in_progress");

    const withWip = await commissions.addWip(c.id, { url: "/art/art-05.svg", note: "underpainting" });
    expect(withWip.wipImages.length).toBe(1);

    const ready = await commissions.markReady(c.id);
    expect(ready.status).toBe("ready");

    const finalPaid = await commissions.payFinal(c.id, "pay_fin_1");
    expect(finalPaid.status).toBe("final_paid");
    expect((finalPaid.depositPaidInr ?? 0) + (finalPaid.finalPaidInr ?? 0)).toBe(16000);

    const delivered = await commissions.markDelivered(c.id);
    expect(delivered.status).toBe("delivered");
    expect(delivered.timeline.map((t) => t.status)).toEqual([
      "submitted",
      "quote_sent",
      "accepted",
      "deposit_paid",
      "in_progress",
      "ready",
      "final_paid",
      "delivered",
    ]);
  });

  it("'let the studio choose' requests can be assigned by the admin", async () => {
    const c = await commissions.create({ ...input(), artistId: null });
    expect(c.artistId).toBeNull();
    const assigned = await commissions.assignArtist(c.id, "u_priya");
    expect(assigned.artistId).toBe("u_priya");
  });

  it("artists can decline, buyers can cancel", async () => {
    const a = await commissions.create(input());
    const declined = await commissions.decline(a.id, "Fully booked");
    expect(declined.status).toBe("declined");

    const b = await commissions.create(input());
    const cancelled = await commissions.cancel(b.id);
    expect(cancelled.status).toBe("cancelled");
  });
});
