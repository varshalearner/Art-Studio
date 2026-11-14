"use client";

import { Avatar } from "@/components/avatar";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Check, CheckCheck, Loader2, Pencil, ThumbsDown } from "lucide-react";
import type { Listing } from "@/types";
import {
  approveListing,
  bulkApproveListings,
  listPendingListings,
  listPendingSellers,
  approveSeller,
  rejectListing,
  requestListingChanges,
  subscribeAdmin,
} from "@/services/admin";
import { getUserById } from "@/services/auth";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { SmartImage } from "@/components/smart-image";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, sizeLabel } from "@/lib/utils";

function SellerName({ sellerId }: { sellerId: string }) {
  const { data } = useQuery({
    queryKey: ["user", sellerId],
    queryFn: () => getUserById(sellerId),
  });
  const p = data?.sellerProfile;
  if (!data) return null;
  return (
    <span className="text-xs text-muted-foreground">
      by <strong>{p?.displayName ?? data.name}</strong> ({p?.country ?? "—"}) · {data.email}
      {p?.status === "pending" && <Badge variant="mustard" className="ml-2">new seller</Badge>}
    </span>
  );
}

export function ReviewQueue() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<string[]>([]);
  const [noteFor, setNoteFor] = useState<{ listing: Listing; action: "changes" | "reject" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["admin-pending"],
    queryFn: listPendingListings,
  });
  const { data: pendingSellers = [] } = useQuery({
    queryKey: ["admin-pending-sellers"],
    queryFn: listPendingSellers,
  });

  useEffect(() => {
    return subscribeAdmin(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    });
  }, [queryClient]);

  if (!user) return <AdminShell title="Review queue">{null}</AdminShell>;
  const admin = { id: user.id, name: user.name };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-pending"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-sellers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["shop"] });
  };

  const approve = async (listing: Listing) => {
    setBusy(true);
    try {
      await approveListing(listing.id, admin);
      toast.success(`'${listing.title}' is now live!`);
      invalidate();
    } finally {
      setBusy(false);
    }
  };

  const bulk = async () => {
    setBusy(true);
    try {
      const count = await bulkApproveListings(selected, admin);
      toast.success(`${count} listing(s) approved.`);
      setSelected([]);
      invalidate();
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async () => {
    if (!noteFor || !note.trim()) return;
    setBusy(true);
    try {
      if (noteFor.action === "changes") {
        await requestListingChanges(noteFor.listing.id, note, admin);
        toast.success("Changes requested — the seller has been notified.");
      } else {
        await rejectListing(noteFor.listing.id, note, admin);
        toast.success("Listing rejected with your note.");
      }
      setNoteFor(null);
      setNote("");
      invalidate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell title="Review queue">
      {/* seller profiles */}
      {pendingSellers.length > 0 && (
        <section className="mb-8" aria-label="Pending seller profiles">
          <h2 className="mb-3 font-display text-lg font-semibold">New seller profiles</h2>
          <div className="space-y-2">
            {pendingSellers.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar src={s.sellerProfile?.avatarUrl || s.avatarUrl} name={s.sellerProfile?.displayName || s.name} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.sellerProfile?.displayName} <span className="text-xs text-muted-foreground">({s.email})</span></p>
                    <p className="truncate text-xs text-muted-foreground">{s.sellerProfile?.bio}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.sellerProfile?.country} · payout: {s.sellerProfile?.payoutMethod}</span>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await approveSeller(s.id, admin);
                      toast.success("Seller approved.");
                      invalidate();
                    }}
                    data-testid="approve-seller"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve seller
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* bulk bar */}
      {pending.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 shadow-cozy">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.length === pending.length && pending.length > 0}
              onChange={(e) => setSelected(e.target.checked ? pending.map((l) => l.id) : [])}
              aria-label="Select all"
            />
            Select all ({selected.length}/{pending.length})
          </label>
          <Button size="sm" onClick={bulk} disabled={busy || selected.length === 0} data-testid="bulk-approve">
            <CheckCheck className="h-3.5 w-3.5" /> Bulk approve selected
          </Button>
        </div>
      )}

      {isLoading ? null : pending.length === 0 ? (
        <EmptyState
          title="Review queue is empty"
          text="All caught up! New uploads and edits will appear here."
        />
      ) : (
        <div className="space-y-4" data-testid="review-queue">
          {pending.map((l) => {
            const isEdit = Boolean(l.pendingEdit);
            const view = l.pendingEdit ?? l;
            return (
              <Card key={l.id} data-testid={`review-item-${l.slug}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(l.id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, l.id] : prev.filter((id) => id !== l.id)
                          )
                        }
                        aria-label={`Select ${l.title}`}
                        className="mt-1"
                      />
                      <span className="relative block h-40 w-32 shrink-0 overflow-hidden rounded-md border shadow-cozy">
                        <SmartImage src={view.images[0]} alt={view.title} fill className="object-cover" />
                      </span>
                    </label>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">{view.title}</h3>
                        {isEdit ? (
                          <Badge variant="mustard"><Pencil className="h-3 w-3" /> edit of live listing</Badge>
                        ) : (
                          <Badge variant="mustard">new listing</Badge>
                        )}
                      </div>
                      <SellerName sellerId={l.sellerId} />
                      <p className="text-sm text-muted-foreground">{view.description}</p>
                      <p className="text-sm">
                        <strong>{format(view.priceInr)}</strong> · {l.medium.replace("_", " ")} ·{" "}
                        {sizeLabel(l.widthCm, l.heightCm)} · {l.kind} · submitted {formatDate(l.updatedAt, locale)}
                      </p>
                      {isEdit && (
                        <p className="rounded bg-muted p-2 text-xs text-muted-foreground">
                          Live version: “{l.title}” at {format(l.priceInr)} — it stays in the shop until
                          you approve or reject this edit.
                        </p>
                      )}
                    </div>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:flex-col">
                      <Button size="sm" onClick={() => approve(l)} disabled={busy} data-testid={`approve-${l.slug}`}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={busy}
                        onClick={() => setNoteFor({ listing: l, action: "changes" })}
                        data-testid={`request-changes-${l.slug}`}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Request changes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => setNoteFor({ listing: l, action: "reject" })}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* note dialog (reason is required) */}
      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteFor?.action === "changes" ? "Request changes" : "Reject listing"}
            </DialogTitle>
            <DialogDescription>
              A reason is required — the seller sees this note on “{noteFor?.listing.title}”.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Please add a photo in natural light and the framed dimensions."
            aria-label="Reason"
            data-testid="review-note"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button
              variant={noteFor?.action === "reject" ? "destructive" : "default"}
              onClick={submitNote}
              disabled={busy || !note.trim()}
              data-testid="review-note-submit"
            >
              {noteFor?.action === "changes" ? "Send to seller" : "Reject with note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
