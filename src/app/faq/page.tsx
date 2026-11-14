import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ" };

const FAQS = [
  {
    q: "How do commissions work?",
    a: "Describe your idea with photos, words or a sketch on our canvas. An artist sends you a quote; you accept and pay a deposit (default 40%). The artist shares work-in-progress photos, and you pay the rest only when the piece is ready.",
  },
  {
    q: "Is every artwork original?",
    a: "Yes. Every listing is reviewed by the studio team before it appears in the gallery, and artists can earn a verified badge.",
  },
  {
    q: "What about shipping?",
    a: "Each artist sets the regions they ship to and the rate per region — you see the exact cost at checkout. Digital artworks are delivered instantly as high-resolution downloads.",
  },
  {
    q: "Which currencies and payment methods are supported?",
    a: "Prices are shown in INR, USD, EUR or GBP (auto-detected, switchable in the navbar). Payment goes through Razorpay (cards, UPI, netbanking) or PayPal for international buyers.",
  },
  {
    q: "Can I return an artwork?",
    a: "Physical artworks can be returned within 14 days if they arrive damaged or significantly not as described — see the Refund & Return Policy. Commission deposits are refundable before work starts.",
  },
  {
    q: "How do I start selling?",
    a: "Click 'Start Selling', fill a short seller profile, and upload your first artwork. Your first listing also triggers a quick seller-profile review — after approval you're live.",
  },
  {
    q: "What fees do artists pay?",
    a: "Listing is free. The studio keeps a small commission (default 10%) from each sale; the rest is paid out to the artist.",
  },
];

export default function FaqPage() {
  return (
    <div className="container max-w-2xl py-12">
      <h1 className="doodle-underline text-3xl font-bold md:text-4xl">Frequently asked questions</h1>
      <dl className="mt-10 space-y-4">
        {FAQS.map((item) => (
          <details key={item.q} className="group rounded-lg border bg-card p-5 shadow-cozy open:shadow-lifted">
            <summary className="cursor-pointer list-none font-display text-lg font-semibold marker:hidden">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </dl>
    </div>
  );
}
