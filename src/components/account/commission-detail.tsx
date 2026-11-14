"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, MessageCircle, XCircle } from "lucide-react";
import {
  acceptCommissionQuote,
  cancelCommission,
  getCommissionById,
  payCommissionDeposit,
  payCommissionFinal,
} from "@/services/commissions";
import { getUserById } from "@/services/auth";
import { getOrCreateThread } from "@/services/messages";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { AccountShell } from "@/components/account/account-shell";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { SmartImage } from "@/components/smart-image";
import { MockPaymentDialog } from "@/components/checkout/mock-payment-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";
import type { PaymentResult } from "@/services/payments";

export function CommissionDetail({ commissionId }: { commissionId: string }) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [payKind, setPayKind] = useState<null | "deposit" | "final">(null);

  const { data: c, isLoading } = useQuery({
    queryKey: ["commission", commissionId],
    queryFn: () => getCommissionById(commissionId),
  });
  const { data: artist } = useQuery({
    queryKey: ["user", c?.artistId],
    queryFn: () => getUserById(c!.artistId!),
    enabled: !!c?.artistId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["commission", commissionId] });
    queryClient.invalidateQueries({ queryKey: ["my-commissions"] });
  };

  if (isLoading) return <AccountShell title="Commission">{null}</AccountShell>;
  if (!c) {
    return (
      <AccountShell title="Commission">
        <EmptyState title="Commission not found" />
      </AccountShell>
    );
  }

  const depositInr = c.quoteInr ? Math.round((c.quoteInr * c.depositPercent) / 100) : 0;
  const finalInr = c.quoteInr ? c.quoteInr - (c.depositPaidInr ?? 0) : 0;

  const accept = async () => {
    await acceptCommissionQuote(c.id);
    invalidate();
    toast.success("Quote accepted — next step: the deposit.");
  };

  const cancel = async () => {
    await cancelCommission(c.id);
    invalidate();
    toast.info("Commission cancelled.");
  };

  const onPaid = async (result: PaymentResult) => {
    if (payKind === "deposit") {
      await payCommissionDeposit(c.id, result.paymentId);
      toast.success("Deposit paid — the artist can start!");
    } else if (payKind === "final") {
      await payCommissionFinal(c.id, result.paymentId);
      toast.success("Final payment made — delivery is next!");
    }
    setPayKind(null);
    invalidate();
  };

  const message = async () => {
    if (!user || !c.artistId) return;
    const other = artist ?? (await getUserById(c.artistId));
    if (!other) return;
    const thread = await getOrCreateThread({
      userId: user.id,
      userName: user.name,
      otherUserId: other.id,
      otherUserName: other.sellerProfile?.displayName ?? other.name,
      context: { type: "commission", id: c.id },
      contextLabel: `Commission: ${c.title}`,
    });
    router.push(`/messages/${thread.id}`);
  };

  return (
    <AccountShell title={c.title}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Request</CardTitle>
              <StatusBadge status={c.status} testId="commission-status" />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="leading-relaxed">{c.description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-3 py-1 capitalize">{c.medium.replace("_", " ")}</span>
                <span className="rounded-full bg-muted px-3 py-1">{c.size}</span>
                {c.style && <span className="rounded-full bg-muted px-3 py-1">{c.style}</span>}
                {c.deadline && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                    <CalendarDays className="h-3 w-3" /> by {formatDate(c.deadline, locale)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Budget: {format(c.budgetMinInr)} – {format(c.budgetMaxInr)} ·{" "}
                Artist: {c.artistId ? (artist?.sellerProfile?.displayName ?? "…") : "the studio will choose"}
              </p>
              {(c.referenceImages.length > 0 || c.sketchImage) && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {c.referenceImages.map((img, i) => (
                    <span key={i} className="relative h-24 w-24 overflow-hidden rounded-md border shadow-cozy">
                      <SmartImage src={img} alt={`Reference ${i + 1}`} fill className="object-cover" />
                    </span>
                  ))}
                  {c.sketchImage && (
                    <span className="relative h-24 w-32 overflow-hidden rounded-md border-2 border-accent shadow-cozy" title="Your sketch">
                      <SmartImage src={c.sketchImage} alt="Your sketch" fill className="object-cover" />
                      <span className="absolute bottom-0 left-0 rounded-tr bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                        sketch
                      </span>
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* quote + actions */}
          {c.status === "quote_sent" && c.quoteInr && (
            <Card className="border-2 border-accent/60">
              <CardHeader>
                <CardTitle>Quote from the artist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-display text-3xl font-bold text-primary" data-testid="quote-amount">
                  {format(c.quoteInr)}
                </p>
                {c.quoteNote && <p className="text-sm italic text-muted-foreground">“{c.quoteNote}”</p>}
                <p className="text-sm">
                  Accept to pay a {c.depositPercent}% deposit ({format(depositInr)}) now; the remaining{" "}
                  {format(c.quoteInr - depositInr)} is due when the artwork is ready.
                </p>
                <div className="flex gap-2">
                  <Button onClick={accept} data-testid="accept-quote">
                    <CheckCircle2 className="h-4 w-4" /> Accept quote
                  </Button>
                  <Button variant="ghost" onClick={cancel}>
                    <XCircle className="h-4 w-4" /> Cancel request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {c.status === "accepted" && (
            <Card className="border-2 border-primary/50">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-sm">
                  Pay the <strong>{c.depositPercent}% deposit ({format(depositInr)})</strong> so the artist can start.
                </p>
                <Button onClick={() => setPayKind("deposit")} data-testid="pay-deposit">
                  Pay deposit {format(depositInr)}
                </Button>
              </CardContent>
            </Card>
          )}

          {c.status === "ready" && (
            <Card className="border-2 border-primary/50">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-sm">
                  Your artwork is <strong>ready</strong>! Pay the remaining {format(finalInr)} to receive it.
                </p>
                <Button onClick={() => setPayKind("final")} data-testid="pay-final">
                  Pay {format(finalInr)}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* WIP gallery */}
          {c.wipImages.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Work in progress 🖌️</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {c.wipImages.map((wip, i) => (
                  <figure key={i} className="w-40">
                    <span className="relative block aspect-[4/5] overflow-hidden rounded-md border shadow-cozy">
                      <SmartImage src={wip.url} alt={`Work in progress ${i + 1}`} fill className="object-cover" />
                    </span>
                    <figcaption className="mt-1 text-xs text-muted-foreground">
                      {wip.note && <span className="block italic">“{wip.note}”</span>}
                      {formatDate(wip.at, locale)}
                    </figcaption>
                  </figure>
                ))}
              </CardContent>
            </Card>
          )}

          {c.artistId && (
            <Button variant="outline" onClick={message}>
              <MessageCircle className="h-4 w-4" /> Message the artist
            </Button>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Commission timeline</CardTitle></CardHeader>
          <CardContent>
            <Timeline events={c.timeline} />
          </CardContent>
        </Card>
      </div>

      <MockPaymentDialog
        open={payKind !== null}
        onOpenChange={(open) => !open && setPayKind(null)}
        amountLabel={payKind === "deposit" ? format(depositInr) : format(finalInr)}
        description={
          payKind === "deposit"
            ? `${c.depositPercent}% deposit for '${c.title}'`
            : `Final payment for '${c.title}'`
        }
        onSuccess={onPaid}
      />
    </AccountShell>
  );
}
