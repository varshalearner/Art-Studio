"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Paintbrush } from "lucide-react";
import { becomeSeller } from "@/services/auth";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Short seller profile form — any user becomes a seller with one form. */
export function SellerOnboarding() {
  const { user, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!displayName.trim() || !bio.trim() || !country.trim() || !payout.trim()) {
      toast.error("Please fill in all the fields — buyers love knowing their artists.");
      return;
    }
    setBusy(true);
    try {
      await becomeSeller(user.id, {
        displayName,
        bio,
        country,
        payoutMethod: payout,
      });
      await refresh();
      toast.success("Welcome to the studio! Your first listing will also trigger a quick profile review.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the seller profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container flex justify-center py-12">
      <Card className="w-full max-w-xl">
        <CardHeader className="items-center text-center">
          <span className="rounded-full bg-secondary/20 p-3">
            <Paintbrush className="h-6 w-6 text-sage-dark" aria-hidden />
          </span>
          <CardTitle className="text-2xl">Start selling your art</CardTitle>
          <CardDescription>
            One short profile and you're in. Your first listing goes through a friendly admin
            review, and then you're live in the gallery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="s-name">Artist / display name</Label>
            <Input id="s-name" className="mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="seller-name" />
          </div>
          <div>
            <Label htmlFor="s-bio">Short bio</Label>
            <Textarea
              id="s-bio"
              className="mt-1"
              placeholder="What do you paint? What moves you?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              data-testid="seller-bio"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-country">Country</Label>
              <Input id="s-country" className="mt-1" placeholder="India" value={country} onChange={(e) => setCountry(e.target.value)} data-testid="seller-country" />
            </div>
            <div>
              <Label htmlFor="s-payout">Payout details</Label>
              <Input id="s-payout" className="mt-1" placeholder="UPI id / bank / PayPal email" value={payout} onChange={(e) => setPayout(e.target.value)} data-testid="seller-payout" />
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={submit} disabled={busy} data-testid="seller-submit">
            Create my seller profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
