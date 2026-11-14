import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Shipping Policy" };

export default function ShippingPage() {
  return (
    <LegalPage title="Shipping Policy">
      <section>
        <h2>Who ships</h2>
        <p>
          Artworks ship directly from each artist&apos;s studio. Every artist chooses the
          regions they ship to (India, Asia, Europe, North America, rest of world) and the rate
          for each — you see the exact shipping cost at checkout, before paying.
        </p>
      </section>
      <section>
        <h2>Times</h2>
        <ul>
          <li>Domestic (same country as the artist): usually 3–7 business days.</li>
          <li>International: usually 7–21 business days, depending on customs.</li>
          <li>Each shipment gets a tracking number visible on your order timeline.</li>
        </ul>
      </section>
      <section>
        <h2>Packaging</h2>
        <p>Originals travel in rigid, moisture-protected packaging; large canvases may ship rolled in a tube for safety.</p>
      </section>
      <section>
        <h2>Customs &amp; duties</h2>
        <p>International orders may attract import duties charged by your country — these are the buyer&apos;s responsibility.</p>
      </section>
      <section>
        <h2>Digital artworks</h2>
        <p>No shipping at all: the full-resolution file unlocks on your order page immediately after payment.</p>
      </section>
    </LegalPage>
  );
}
