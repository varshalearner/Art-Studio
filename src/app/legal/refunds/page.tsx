import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Refund & Return Policy" };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund & Return Policy">
      <section>
        <h2>Physical artworks</h2>
        <ul>
          <li>Arrived damaged or significantly not as described? Tell us within 14 days of delivery with photos — you get a full refund or a replacement where possible.</li>
          <li>Changed your mind? Original art is made and packed by individual artists, so change-of-mind returns are accepted at the artist&apos;s discretion; return shipping is on the buyer.</li>
        </ul>
      </section>
      <section>
        <h2>Digital artworks</h2>
        <p>
          Because files are delivered instantly, digital purchases are refundable only if the
          file is corrupted or materially different from the listing.
        </p>
      </section>
      <section>
        <h2>Commissions</h2>
        <ul>
          <li>Deposit: fully refundable until the artist starts work.</li>
          <li>After work starts: the deposit covers the artist&apos;s time; the final payment is only taken once you have seen the piece marked ready.</li>
        </ul>
      </section>
      <section>
        <h2>How refunds are paid</h2>
        <p>Refunds go back to the original payment method via Razorpay or PayPal, usually within 5–10 business days.</p>
      </section>
    </LegalPage>
  );
}
