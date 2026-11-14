import type { Commission, CommissionStatus } from "@/types";
import { findById, getAll, insert, subscribe, updateById } from "@/lib/local/db";
import { uid, nowIso, rateLimit } from "@/lib/utils";
import { push as notify } from "@/services/notifications/local";
import { siteConfig } from "@/config";
import { DEMO_IDS } from "@/lib/demo-data";

export interface NewCommissionInput {
  buyerId: string;
  artistId: string | null;
  title: string;
  description: string;
  medium: Commission["medium"];
  size: string;
  style: string;
  budgetMinInr: number;
  budgetMaxInr: number;
  deadline?: string;
  referenceImages: string[];
  sketchImage?: string;
}

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  quote_sent: "Quote sent",
  accepted: "Quote accepted",
  deposit_paid: "Deposit paid",
  in_progress: "In progress",
  ready: "Ready",
  final_paid: "Final payment made",
  delivered: "Delivered",
  declined: "Declined",
  cancelled: "Cancelled",
};

export async function create(input: NewCommissionInput): Promise<Commission> {
  if (!rateLimit(`commission_${input.buyerId}`, 5, 60 * 60 * 1000)) {
    throw new Error("You've sent several requests recently — please try again in an hour.");
  }
  const now = nowIso();
  const commission: Commission = {
    id: uid("c"),
    buyerId: input.buyerId,
    artistId: input.artistId,
    title: input.title,
    description: input.description,
    medium: input.medium,
    size: input.size,
    style: input.style,
    budgetMinInr: input.budgetMinInr,
    budgetMaxInr: input.budgetMaxInr,
    deadline: input.deadline,
    referenceImages: input.referenceImages,
    sketchImage: input.sketchImage,
    status: "submitted",
    depositPercent: siteConfig.commissionDepositPercent,
    wipImages: [],
    timeline: [
      {
        status: "submitted",
        at: now,
        note: input.artistId ? undefined : "Studio will match an artist",
      },
    ],
    createdAt: now,
  };
  insert("commissions", commission);
  await notify({
    userId: input.artistId ?? DEMO_IDS.admin,
    type: "commission_status",
    title: "New commission request 🎨",
    body: `'${commission.title}' — budget ₹${input.budgetMinInr.toLocaleString("en-IN")}–₹${input.budgetMaxInr.toLocaleString("en-IN")}`,
    href: input.artistId ? "/sell?tab=commissions" : "/admin/commissions",
  });
  return commission;
}

export async function listMine(buyerId: string): Promise<Commission[]> {
  return getAll<Commission>("commissions")
    .filter((c) => c.buyerId === buyerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listForArtist(artistId: string): Promise<Commission[]> {
  return getAll<Commission>("commissions")
    .filter((c) => c.artistId === artistId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getById(id: string): Promise<Commission | null> {
  return findById<Commission>("commissions", id) ?? null;
}

async function transition(
  id: string,
  status: CommissionStatus,
  patch: Partial<Commission>,
  note: string | undefined,
  notifyUserId: (c: Commission) => string | null,
  notifyBody?: string
): Promise<Commission> {
  const commission = updateById<Commission>("commissions", id, (c) => ({
    ...c,
    ...patch,
    status,
    timeline: [...c.timeline, { status, at: nowIso(), note }],
  }));
  if (!commission) throw new Error("Commission not found");
  const target = notifyUserId(commission);
  if (target) {
    await notify({
      userId: target,
      type: "commission_status",
      title: `Commission update: ${STATUS_LABEL[status] ?? status}`,
      body: notifyBody ?? `'${commission.title}' is now ${STATUS_LABEL[status] ?? status}.`,
      href:
        target === commission.buyerId
          ? `/account/commissions/${commission.id}`
          : "/sell?tab=commissions",
    });
  }
  return commission;
}

export async function sendQuote(
  id: string,
  quoteInr: number,
  quoteNote: string
): Promise<Commission> {
  return transition(
    id,
    "quote_sent",
    { quoteInr, quoteNote },
    `Quote: ₹${quoteInr.toLocaleString("en-IN")}`,
    (c) => c.buyerId,
    `Quote of ₹${quoteInr.toLocaleString("en-IN")} received — review and accept to begin.`
  );
}

export async function decline(id: string, note?: string): Promise<Commission> {
  return transition(id, "declined", {}, note, (c) => c.buyerId);
}

export async function cancel(id: string): Promise<Commission> {
  return transition(id, "cancelled", {}, "Cancelled by customer", (c) => c.artistId);
}

export async function accept(id: string): Promise<Commission> {
  return transition(id, "accepted", {}, undefined, (c) => c.artistId,
    "Your quote was accepted! Waiting for the deposit.");
}

export async function payDeposit(id: string, paymentId: string): Promise<Commission> {
  const c = await getById(id);
  if (!c?.quoteInr) throw new Error("No quote to pay");
  const deposit = Math.round((c.quoteInr * c.depositPercent) / 100);
  return transition(
    id,
    "deposit_paid",
    { depositPaidInr: deposit },
    `Deposit ₹${deposit.toLocaleString("en-IN")} (${c.depositPercent}%) · ${paymentId}`,
    (cc) => cc.artistId,
    "Deposit received — you can start painting!"
  );
}

export async function startWork(id: string): Promise<Commission> {
  return transition(id, "in_progress", {}, undefined, (c) => c.buyerId,
    "The artist has started working on your commission.");
}

export async function addWip(
  id: string,
  wip: { url: string; note?: string }
): Promise<Commission> {
  const commission = updateById<Commission>("commissions", id, (c) => ({
    ...c,
    wipImages: [...c.wipImages, { ...wip, at: nowIso() }],
  }));
  if (!commission) throw new Error("Commission not found");
  await notify({
    userId: commission.buyerId,
    type: "commission_status",
    title: "Work-in-progress shared 🖌️",
    body: `New progress image on '${commission.title}'.`,
    href: `/account/commissions/${commission.id}`,
  });
  return commission;
}

export async function markReady(id: string): Promise<Commission> {
  const c = await getById(id);
  const remaining = c?.quoteInr ? c.quoteInr - (c.depositPaidInr ?? 0) : 0;
  return transition(id, "ready", {}, undefined, (cc) => cc.buyerId,
    `Your commission is ready! Pay the remaining ₹${remaining.toLocaleString("en-IN")} to receive it.`);
}

export async function payFinal(id: string, paymentId: string): Promise<Commission> {
  const c = await getById(id);
  if (!c?.quoteInr) throw new Error("No quote on this commission");
  const remaining = c.quoteInr - (c.depositPaidInr ?? 0);
  return transition(
    id,
    "final_paid",
    { finalPaidInr: remaining },
    `Final payment ₹${remaining.toLocaleString("en-IN")} · ${paymentId}`,
    (cc) => cc.artistId,
    "Final payment received — time to deliver the artwork!"
  );
}

export async function markDelivered(id: string): Promise<Commission> {
  return transition(id, "delivered", {}, undefined, (c) => c.buyerId,
    "Your commission has been delivered. Enjoy! 🎉");
}

/** Admin: assign an artist to a "studio chooses" request. */
export async function assignArtist(id: string, artistId: string): Promise<Commission> {
  const commission = updateById<Commission>("commissions", id, (c) => ({
    ...c,
    artistId,
    timeline: [
      ...c.timeline,
      { status: "submitted", at: nowIso(), note: "Artist assigned by the studio" },
    ],
  }));
  if (!commission) throw new Error("Commission not found");
  await notify({
    userId: artistId,
    type: "commission_status",
    title: "New commission assigned to you 🎨",
    body: `The studio matched you with '${commission.title}'.`,
    href: "/sell?tab=commissions",
  });
  await notify({
    userId: commission.buyerId,
    type: "commission_status",
    title: "An artist was matched!",
    body: `Your request '${commission.title}' now has an artist.`,
    href: `/account/commissions/${commission.id}`,
  });
  return commission;
}

export function subscribeCommissions(cb: () => void): () => void {
  return subscribe("commissions", cb);
}
