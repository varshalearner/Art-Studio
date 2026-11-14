import type { Commission, CommissionStatus } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { mapCommission } from "@/lib/supabase/mappers";
import { nowIso } from "@/lib/utils";
import { push as notify } from "@/services/notifications/supabase";
import { siteConfig } from "@/config";
import type { NewCommissionInput } from "./local";
export type { NewCommissionInput };

export async function create(input: NewCommissionInput): Promise<Commission> {
  const now = nowIso();
  const { data, error } = await getSupabase()
    .from("commissions")
    .insert({
      buyer_id: input.buyerId,
      artist_id: input.artistId,
      title: input.title,
      description: input.description,
      medium: input.medium,
      size: input.size,
      style: input.style,
      budget_min_inr: input.budgetMinInr,
      budget_max_inr: input.budgetMaxInr,
      deadline: input.deadline ?? null,
      reference_images: input.referenceImages,
      sketch_image: input.sketchImage ?? null,
      status: "submitted",
      deposit_percent: siteConfig.commissionDepositPercent,
      wip_images: [],
      timeline: [
        {
          status: "submitted",
          at: now,
          note: input.artistId ? undefined : "Studio will match an artist",
        },
      ],
    })
    .select()
    .single();
  if (error) throw error;
  const commission = mapCommission(data);
  if (input.artistId) {
    await notify({
      userId: input.artistId,
      type: "commission_status",
      title: "New commission request 🎨",
      body: `'${commission.title}'`,
      href: "/sell?tab=commissions",
    });
  }
  return commission;
}

export async function listMine(buyerId: string): Promise<Commission[]> {
  const { data, error } = await getSupabase()
    .from("commissions")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCommission);
}

export async function listForArtist(artistId: string): Promise<Commission[]> {
  const { data, error } = await getSupabase()
    .from("commissions")
    .select("*")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCommission);
}

export async function getById(id: string): Promise<Commission | null> {
  const { data, error } = await getSupabase()
    .from("commissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCommission(data) : null;
}

async function transition(
  id: string,
  status: CommissionStatus,
  patch: Record<string, unknown>,
  note?: string
): Promise<Commission> {
  const current = await getById(id);
  if (!current) throw new Error("Commission not found");
  const { data, error } = await getSupabase()
    .from("commissions")
    .update({
      ...patch,
      status,
      timeline: [...current.timeline, { status, at: nowIso(), note }],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapCommission(data);
}

export async function sendQuote(id: string, quoteInr: number, quoteNote: string): Promise<Commission> {
  const c = await transition(id, "quote_sent", { quote_inr: quoteInr, quote_note: quoteNote },
    `Quote: ₹${quoteInr.toLocaleString("en-IN")}`);
  await notify({
    userId: c.buyerId,
    type: "commission_status",
    title: "You received a quote",
    body: `₹${quoteInr.toLocaleString("en-IN")} for '${c.title}'`,
    href: `/account/commissions/${c.id}`,
  });
  return c;
}

export async function decline(id: string, note?: string): Promise<Commission> {
  return transition(id, "declined", {}, note);
}

export async function cancel(id: string): Promise<Commission> {
  return transition(id, "cancelled", {}, "Cancelled by customer");
}

export async function accept(id: string): Promise<Commission> {
  return transition(id, "accepted", {});
}

export async function payDeposit(id: string, paymentId: string): Promise<Commission> {
  const c = await getById(id);
  if (!c?.quoteInr) throw new Error("No quote to pay");
  const deposit = Math.round((c.quoteInr * c.depositPercent) / 100);
  return transition(id, "deposit_paid", { deposit_paid_inr: deposit },
    `Deposit ₹${deposit.toLocaleString("en-IN")} · ${paymentId}`);
}

export async function startWork(id: string): Promise<Commission> {
  return transition(id, "in_progress", {});
}

export async function addWip(id: string, wip: { url: string; note?: string }): Promise<Commission> {
  const current = await getById(id);
  if (!current) throw new Error("Commission not found");
  const { data, error } = await getSupabase()
    .from("commissions")
    .update({ wip_images: [...current.wipImages, { ...wip, at: nowIso() }] })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const c = mapCommission(data);
  await notify({
    userId: c.buyerId,
    type: "commission_status",
    title: "Work-in-progress shared 🖌️",
    body: `New progress image on '${c.title}'.`,
    href: `/account/commissions/${c.id}`,
  });
  return c;
}

export async function markReady(id: string): Promise<Commission> {
  return transition(id, "ready", {});
}

export async function payFinal(id: string, paymentId: string): Promise<Commission> {
  const c = await getById(id);
  if (!c?.quoteInr) throw new Error("No quote on this commission");
  const remaining = c.quoteInr - (c.depositPaidInr ?? 0);
  return transition(id, "final_paid", { final_paid_inr: remaining },
    `Final payment ₹${remaining.toLocaleString("en-IN")} · ${paymentId}`);
}

export async function markDelivered(id: string): Promise<Commission> {
  return transition(id, "delivered", {});
}

export async function assignArtist(id: string, artistId: string): Promise<Commission> {
  const current = await getById(id);
  if (!current) throw new Error("Commission not found");
  const { data, error } = await getSupabase()
    .from("commissions")
    .update({
      artist_id: artistId,
      timeline: [
        ...current.timeline,
        { status: "submitted", at: nowIso(), note: "Artist assigned by the studio" },
      ],
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapCommission(data);
}

export function subscribeCommissions(cb: () => void): () => void {
  const channel = getSupabase()
    .channel("commissions:all")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "commissions" },
      () => cb()
    )
    .subscribe();
  return () => {
    getSupabase().removeChannel(channel);
  };
}
