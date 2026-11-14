"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  Brush,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  IndianRupee,
  Loader2,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Truck,
} from "lucide-react";
import type { Commission } from "@/types";
import {
  listMyListings,
  pauseListing,
  resumeListing,
  submitListingForReview,
  getSellerEarnings,
  subscribeMyListings,
} from "@/services/listings";
import { listMySales, markOrderShipped, markOrderDelivered } from "@/services/orders";
import {
  listArtistCommissions,
  sendCommissionQuote,
  declineCommission,
  startCommissionWork,
  addCommissionWip,
  markCommissionReady,
  markCommissionDelivered,
} from "@/services/commissions";
import { uploadFile } from "@/services/storage";
import { useAuth } from "@/components/auth-context";
import { useCurrency } from "@/components/currency-context";
import { SellerOnboarding } from "@/components/sell/seller-onboarding";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { SmartImage } from "@/components/smart-image";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export function SellDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const locale = useLocale();

  const [expandedListing, setExpandedListing] = useState<string | null>(null);
  const [quoteFor, setQuoteFor] = useState<Commission | null>(null);
  const [quoteAmount, setQuoteAmount] = useState(10000);
  const [quoteNote, setQuoteNote] = useState("");
  const [wipFor, setWipFor] = useState<Commission | null>(null);
  const [wipNote, setWipNote] = useState("");
  const [wipFile, setWipFile] = useState<File | null>(null);
  const [shipFor, setShipFor] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  const sellerId = user?.id;
  const isSeller = !!user?.isSeller;

  const { data: listings, isLoading: loadingListings } = useQuery({
    queryKey: ["my-listings", sellerId],
    queryFn: () => listMyListings(sellerId!),
    enabled: !!sellerId && isSeller,
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["my-sales", sellerId],
    queryFn: () => listMySales(sellerId!),
    enabled: !!sellerId && isSeller,
  });
  const { data: commissions = [] } = useQuery({
    queryKey: ["artist-commissions", sellerId],
    queryFn: () => listArtistCommissions(sellerId!),
    enabled: !!sellerId && isSeller,
  });
  const { data: earnings } = useQuery({
    queryKey: ["earnings", sellerId],
    queryFn: () => getSellerEarnings(sellerId!),
    enabled: !!sellerId && isSeller,
  });

  // live status updates
  useEffect(() => {
    if (!isSeller) return;
    return subscribeMyListings(() => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    });
  }, [isSeller, queryClient]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/sell");
  }, [loading, user, router]);

  if (loading || !user) return <div className="container py-10"><Skeleton className="h-64 rounded-lg" /></div>;
  if (!isSeller) return <SellerOnboarding />;

  const invalidate = (key: string) => queryClient.invalidateQueries({ queryKey: [key] });

  const sendQuote = async () => {
    if (!quoteFor) return;
    setBusy(true);
    try {
      await sendCommissionQuote(quoteFor.id, quoteAmount, quoteNote);
      toast.success("Quote sent to the customer!");
      setQuoteFor(null);
      setQuoteNote("");
      invalidate("artist-commissions");
    } finally {
      setBusy(false);
    }
  };

  const shareWip = async () => {
    if (!wipFor || !wipFile) return;
    setBusy(true);
    try {
      const url = await uploadFile(wipFile, "wip");
      await addCommissionWip(wipFor.id, { url, note: wipNote || undefined });
      toast.success("Progress shared with the customer 🖌️");
      setWipFor(null);
      setWipNote("");
      setWipFile(null);
      invalidate("artist-commissions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const ship = async () => {
    if (!shipFor || !tracking.trim()) return;
    setBusy(true);
    try {
      await markOrderShipped(shipFor, tracking.trim());
      toast.success("Marked as shipped — the buyer has been notified.");
      setShipFor(null);
      setTracking("");
      invalidate("my-sales");
    } finally {
      setBusy(false);
    }
  };

  const pendingSellerReview = user.sellerProfile?.status === "pending";
  const defaultTab = params.get("tab") ?? "listings";

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="doodle-underline text-3xl font-bold">Seller dashboard</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {user.sellerProfile?.displayName} ·{" "}
            {pendingSellerReview ? "profile pending studio review" : "profile approved"}
            {user.sellerProfile?.verified && " · verified ✓"}
          </p>
        </div>
        <Button onClick={() => router.push("/sell/new")} data-testid="new-listing">
          <Plus className="h-4 w-4" /> Upload artwork
        </Button>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="listings" data-testid="tab-listings">
            <ImagePlus className="mr-1 h-3.5 w-3.5" /> My Listings
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <Package className="mr-1 h-3.5 w-3.5" /> Orders to fulfil
          </TabsTrigger>
          <TabsTrigger value="commissions" data-testid="tab-commissions">
            <Brush className="mr-1 h-3.5 w-3.5" /> Commissions
          </TabsTrigger>
          <TabsTrigger value="earnings">
            <IndianRupee className="mr-1 h-3.5 w-3.5" /> Earnings
          </TabsTrigger>
        </TabsList>

        {/* ---------------- listings ---------------- */}
        <TabsContent value="listings">
          {loadingListings ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : !listings || listings.length === 0 ? (
            <EmptyState
              title="Nothing on your easel yet"
              text="Upload your first artwork — it goes live after a quick studio review."
              action={<Button onClick={() => router.push("/sell/new")}>Upload artwork</Button>}
            />
          ) : (
            <div className="space-y-3" data-testid="my-listings">
              {listings.map((l) => (
                <Card key={l.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <span className="relative h-16 w-[52px] shrink-0 overflow-hidden rounded-md border">
                        <SmartImage src={l.images[0]} alt={l.title} fill className="object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-semibold">{l.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(l.priceInr)} · {l.kind} · updated {formatDate(l.updatedAt, locale)}
                        </p>
                        {l.pendingEdit && (
                          <p className="mt-0.5 text-xs font-semibold text-mustard-dark">
                            Edit pending review — old version stays live
                          </p>
                        )}
                      </div>
                      <StatusBadge status={l.status} testId={`listing-status-${l.slug}`} />
                      <div className="flex items-center gap-1">
                        {(l.status === "draft" || l.status === "changes_requested") && (
                          <Button
                            size="sm"
                            variant="accent"
                            onClick={async () => {
                              await submitListingForReview(l.id);
                              toast.success("Submitted for review!");
                              invalidate("my-listings");
                            }}
                            data-testid={`submit-review-${l.slug}`}
                          >
                            <Send className="h-3.5 w-3.5" /> Submit
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => router.push(`/sell/edit/${l.id}`)} aria-label="Edit" data-testid={`edit-${l.slug}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {l.status === "approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Pause listing"
                            onClick={async () => {
                              await pauseListing(l.id);
                              invalidate("my-listings");
                            }}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {l.status === "paused" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Resume listing"
                            onClick={async () => {
                              await resumeListing(l.id);
                              invalidate("my-listings");
                            }}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Show status history"
                          aria-expanded={expandedListing === l.id}
                          onClick={() => setExpandedListing(expandedListing === l.id ? null : l.id)}
                        >
                          {expandedListing === l.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    {l.adminNote && (l.status === "changes_requested" || l.status === "rejected") && (
                      <p className="mt-3 rounded-md bg-terracotta/10 p-3 text-sm" data-testid="admin-note">
                        <strong>Studio note:</strong> {l.adminNote}
                      </p>
                    )}
                    {expandedListing === l.id && (
                      <div className="mt-4 border-t pt-4">
                        <Timeline events={l.statusHistory} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- orders ---------------- */}
        <TabsContent value="orders">
          {sales.length === 0 ? (
            <EmptyState title="No orders yet" text="When someone buys your art, it appears here to pack & ship." />
          ) : (
            <div className="space-y-3" data-testid="sales-list">
              {sales.map((order) => {
                const myItems = order.items.filter((i) => i.sellerId === sellerId);
                return (
                  <Card key={order.id}>
                    <CardContent className="flex flex-wrap items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{myItems.map((i) => i.title).join(", ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt, locale)} ·{" "}
                          {order.shippingAddress
                            ? `${order.shippingAddress.city}, ${order.shippingAddress.country}`
                            : "digital delivery"}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                      <span className="font-semibold text-primary">
                        {format(myItems.reduce((s, i) => s + i.priceInr * i.qty, 0))}
                      </span>
                      {order.status === "paid" && myItems.some((i) => i.kind === "physical") && (
                        <Button size="sm" onClick={() => setShipFor(order.id)} data-testid="mark-shipped">
                          <Truck className="h-3.5 w-3.5" /> Mark shipped
                        </Button>
                      )}
                      {order.status === "shipped" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            await markOrderDelivered(order.id);
                            invalidate("my-sales");
                          }}
                        >
                          Mark delivered
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---------------- commissions ---------------- */}
        <TabsContent value="commissions">
          {commissions.length === 0 ? (
            <EmptyState
              title="No commission requests yet"
              text="Customers can pick you directly from your artist page."
            />
          ) : (
            <div className="space-y-3" data-testid="artist-commissions">
              {commissions.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-semibold">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.medium.replace("_", " ")} · {c.size} · budget {format(c.budgetMinInr)}–{format(c.budgetMaxInr)}
                          {c.deadline && ` · by ${formatDate(c.deadline, locale)}`}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                    {(c.referenceImages.length > 0 || c.sketchImage) && (
                      <div className="flex flex-wrap gap-2">
                        {c.referenceImages.map((img, i) => (
                          <span key={i} className="relative h-16 w-16 overflow-hidden rounded border">
                            <SmartImage src={img} alt={`Reference ${i + 1}`} fill className="object-cover" />
                          </span>
                        ))}
                        {c.sketchImage && (
                          <span className="relative h-16 w-20 overflow-hidden rounded border-2 border-accent">
                            <SmartImage src={c.sketchImage} alt="Customer sketch" fill className="object-cover" />
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {c.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setQuoteFor(c);
                              setQuoteAmount(Math.round((c.budgetMinInr + c.budgetMaxInr) / 2));
                            }}
                            data-testid="send-quote"
                          >
                            Send quote
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await declineCommission(c.id, "The artist is unavailable right now.");
                              invalidate("artist-commissions");
                            }}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {c.status === "deposit_paid" && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            await startCommissionWork(c.id);
                            invalidate("artist-commissions");
                          }}
                          data-testid="start-work"
                        >
                          Start work
                        </Button>
                      )}
                      {(c.status === "in_progress" || c.status === "deposit_paid") && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setWipFor(c)} data-testid="share-wip">
                            <ImagePlus className="h-3.5 w-3.5" /> Share progress
                          </Button>
                          <Button
                            size="sm"
                            variant="accent"
                            onClick={async () => {
                              await markCommissionReady(c.id);
                              invalidate("artist-commissions");
                            }}
                            data-testid="mark-ready"
                          >
                            Mark ready
                          </Button>
                        </>
                      )}
                      {c.status === "final_paid" && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            await markCommissionDelivered(c.id);
                            invalidate("artist-commissions");
                          }}
                          data-testid="mark-delivered"
                        >
                          Mark delivered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- earnings ---------------- */}
        <TabsContent value="earnings">
          {earnings && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross sales</p>
                  <p className="font-display text-2xl font-bold">{format(earnings.totalInr)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Your earnings (after {earnings.commissionPercent}% studio fee)
                  </p>
                  <p className="font-display text-2xl font-bold text-sage-dark">{format(earnings.afterCommissionInr)}</p>
                </CardContent></Card>
                <Card><CardContent className="p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Payouts</p>
                  <p className="font-display text-2xl font-bold">{earnings.payouts.length}</p>
                </CardContent></Card>
              </div>
              <Card>
                <CardContent className="p-5">
                  <h3 className="mb-3 font-display font-semibold">Payout history</h3>
                  {earnings.payouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payouts yet — sell something wonderful first.</p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {earnings.payouts.map((p) => (
                        <li key={p.id} className="flex items-center justify-between py-2">
                          <span className="text-muted-foreground">{formatDate(p.at, locale)}</span>
                          <span className="font-semibold">{format(p.amountInr)}</span>
                          <StatusBadge status={p.status === "paid out" ? "paid" : "pending"} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Payouts are simulated in demo mode. In live mode they run via Razorpay Route /
                    PayPal Payouts after delivery.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* quote dialog */}
      <Dialog open={!!quoteFor} onOpenChange={(o) => !o && setQuoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a quote</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            For “{quoteFor?.title}” — the customer's budget is {quoteFor && format(quoteFor.budgetMinInr)}–
            {quoteFor && format(quoteFor.budgetMaxInr)}.
          </p>
          <div>
            <label className="text-sm font-semibold" htmlFor="quote-amount">Quote (INR)</label>
            <Input
              id="quote-amount"
              type="number"
              min={100}
              className="mt-1"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(Number(e.target.value))}
              data-testid="quote-input"
            />
            <p className="mt-1 text-xs text-muted-foreground">≈ {format(quoteAmount)}</p>
          </div>
          <Textarea
            value={quoteNote}
            onChange={(e) => setQuoteNote(e.target.value)}
            placeholder="A friendly note: timeline, materials, anything to clarify…"
            aria-label="Quote note"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuoteFor(null)}>Cancel</Button>
            <Button onClick={sendQuote} disabled={busy || quoteAmount <= 0} data-testid="quote-send">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WIP dialog */}
      <Dialog open={!!wipFor} onOpenChange={(o) => !o && setWipFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share work-in-progress</DialogTitle>
          </DialogHeader>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setWipFile(e.target.files?.[0] ?? null)}
            aria-label="Progress image"
          />
          <Textarea
            value={wipNote}
            onChange={(e) => setWipNote(e.target.value)}
            placeholder="A line about where the piece stands…"
            aria-label="Progress note"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWipFor(null)}>Cancel</Button>
            <Button onClick={shareWip} disabled={busy || !wipFile}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Share with customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ship dialog */}
      <Dialog open={!!shipFor} onOpenChange={(o) => !o && setShipFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as shipped</DialogTitle>
          </DialogHeader>
          <Input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Tracking number"
            aria-label="Tracking number"
            data-testid="tracking-input"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShipFor(null)}>Cancel</Button>
            <Button onClick={ship} disabled={busy || !tracking.trim()} data-testid="confirm-ship">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
