import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container max-w-xl py-12">
      <h1 className="doodle-underline text-3xl font-bold md:text-4xl">Say hello</h1>
      <p className="mt-6 text-muted-foreground">
        Question about an order, a commission, or selling your art? Write to us — a human (with
        paint under their fingernails) reads every message.
      </p>
      <div className="mt-6 flex flex-col gap-2 text-sm">
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> hello@amber-easel.example
        </p>
        <p className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" /> Or message any artist directly from their page.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
