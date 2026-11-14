"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  return sent ? (
    <p className="mt-8 rounded-lg border-2 border-dashed border-sage/60 bg-secondary/10 p-6 text-center">
      Thank you! We&apos;ll get back to you within a day or two. ☕
    </p>
  ) : (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
        toast.success("Message sent (demo) — in live mode this emails the studio via Resend.");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ct-name">Name</Label>
          <Input id="ct-name" className="mt-1" required />
        </div>
        <div>
          <Label htmlFor="ct-email">Email</Label>
          <Input id="ct-email" type="email" className="mt-1" required />
        </div>
      </div>
      <div>
        <Label htmlFor="ct-msg">Message</Label>
        <Textarea id="ct-msg" className="mt-1 min-h-[120px]" required />
      </div>
      <Button type="submit" size="lg">Send message</Button>
    </form>
  );
}
